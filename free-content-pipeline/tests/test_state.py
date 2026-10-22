"""Unit tests for the post lifecycle (the 'same article again' bug and edit detection)."""
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ttv import state

WANT = ["en", "fr", "ar", "es"]


def post(pid, text="Dogs need water.", title="T", modified="m1"):
    return {"id": pid, "slug": f"post-{pid}", "title": title, "link": "", "modified": modified, "text": text,
            "hash": state.content_hash(title, text)}


def rec_for(p, **langs):
    r = state.new_record(p)
    for l, st in langs.items():
        if st == "done":
            state.mark_done(r, l)
        else:
            r["langs"][l] = {"status": "failed", "attempts": st, "last_error": "x"}
    return r


class Plan(unittest.TestCase):
    def run_plan(self, posts, st, **kw):
        return state.plan(posts, st, WANT, **kw)

    def test_new_post_is_queued(self):
        r = self.run_plan([post("1")], {"posts": {}})
        self.assertEqual([k for _, k, _ in r["queue"]], ["new"])

    def test_complete_post_is_skipped_so_the_next_one_is_taken(self):
        p1, p2 = post("1"), post("2")
        st = {"posts": {"1": rec_for(p1, en="done", fr="done", ar="done", es="done")}}
        r = self.run_plan([p1, p2], st, limit=1)
        self.assertEqual([p["id"] for p, _, _ in r["queue"]], ["2"])           # <- the reported bug

    def test_failed_language_does_not_block_new_posts(self):
        p1, p2 = post("1"), post("2")
        st = {"posts": {"1": rec_for(p1, en="done", fr=1, ar=1, es=1)}}        # newest post is half done
        r = self.run_plan([p1, p2], st, limit=1)
        self.assertEqual([(p["id"], k) for p, k, _ in r["queue"]], [("2", "new")])

    def test_partial_post_is_retried_only_for_missing_languages(self):
        p1 = post("1")
        st = {"posts": {"1": rec_for(p1, en="done", fr=1)}}
        r = self.run_plan([p1], st)
        self.assertEqual(r["queue"][0][1:], ("partial", ["fr", "ar", "es"]))

    def test_gave_up_after_max_attempts(self):
        p1 = post("1")
        st = {"posts": {"1": rec_for(p1, en="done", fr=3, ar="done", es="done")}}
        self.assertEqual(self.run_plan([p1], st, max_attempts=3)["queue"], [])
        r = self.run_plan([p1], st, max_attempts=3, retry_failed=True)
        self.assertEqual(r["queue"][0][1:], ("partial", ["fr"]))

    def test_edit_detected_by_text_not_by_date(self):
        p1 = post("1")
        st = {"posts": {"1": rec_for(p1, en="done", fr="done", ar="done", es="done")}}
        same_text_new_date = post("1", modified="m2")
        r = self.run_plan([same_text_new_date], st)
        self.assertEqual(r["queue"], [])                                        # date only: nothing to redo
        self.assertEqual(len(r["report"]["meta"]), 1)
        edited = post("1", text="Dogs need water and love.", modified="m3")
        r = self.run_plan([edited], st)
        self.assertEqual(r["queue"][0][1], "edited")

    def test_report_only_mode_does_not_queue_edits(self):
        p1 = post("1")
        st = {"posts": {"1": rec_for(p1, en="done", fr="done", ar="done", es="done")}}
        edited = post("1", text="changed")
        self.assertEqual(self.run_plan([edited], st, edit_mode="report_only")["queue"], [])
        self.assertEqual(len(self.run_plan([edited], st, edit_mode="report_only", apply_edits=True)["queue"]), 1)

    def test_order_new_then_edited_then_partial(self):
        a, b, c = post("1"), post("2", text="old"), post("3")
        st = {"posts": {"1": rec_for(a, en="done", fr=1), "2": rec_for(b, en="done", fr="done", ar="done", es="done")}}
        b2 = post("2", text="new text")
        r = self.run_plan([a, b2, c], st)
        self.assertEqual([k for _, k, _ in r["queue"]], ["new", "edited", "partial"])

    def test_only_forces_a_finished_post(self):
        p1 = post("1")
        st = {"posts": {"1": rec_for(p1, en="done", fr="done", ar="done", es="done")}}
        r = self.run_plan([p1], st, only="post-1")
        self.assertEqual(r["queue"][0][1], "forced")

    def test_removed_posts_are_reported(self):
        p1 = post("1")
        st = {"posts": {"1": rec_for(p1, en="done"), "9": rec_for(post("9"), en="done")}}
        self.assertEqual([pid for pid, _ in self.run_plan([p1], st)["removed"]], ["9"])

    def test_old_state_file_is_migrated(self):
        raw = {"11": {"langs": ["en"], "modified": "m", "slug": "s"}}
        st = state._migrate(raw)
        self.assertTrue(state.lang_done(st["posts"]["11"], "en"))
        self.assertIsNone(st["posts"]["11"]["content_hash"])
        p = post("11")
        r = state.plan([p], st, ["en"])                      # unknown hash is adopted, not treated as an edit
        self.assertEqual(r["queue"], [])

    def test_diff_summary(self):
        s = state.diff_summary("A", "Dogs need water. Cats sleep a lot.", "B", "Dogs need water. Birds sing loudly.")
        self.assertTrue(s["title_changed"]); self.assertEqual((s["added"], s["removed"]), (1, 1))


class Safety(unittest.TestCase):
    def test_empty_site_answer_is_not_treated_as_everything_removed(self):
        """cli exits before touching the state when the site returns no post (checked in tests/e2e notes); plan() itself
        would report every known post as removed, which is why the cli guard exists."""
        p1 = post("1")
        st = {"posts": {"1": rec_for(p1, en="done")}}
        self.assertEqual(len(state.plan([], st, WANT)["removed"]), 1)



class Housekeeping(unittest.TestCase):
    def test_ignored_post_is_never_queued_unless_asked(self):
        p1 = post("1"); rec = state.new_record(p1); rec["ignored"] = True
        st = {"posts": {"1": rec}}
        self.assertEqual(state.plan([p1], st, WANT)["queue"], [])
        self.assertEqual(len(state.plan([p1], st, WANT, only="post-1")["queue"]), 1)       # asked by name: processed

    def test_delete_post_delete_lang_and_ignore(self):
        import tempfile
        from ttv import manage
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            for sub in ("output/post-1/en", "output/post-1/fr", "media/post-1", "articles"):
                (d / sub).mkdir(parents=True)
            (d / "output/post-1/en/v.mp4").write_bytes(b"x" * 100); (d / "articles/post-1.md").write_text("a")
            p1 = post("1"); st = {"posts": {"1": rec_for(p1, en="done", fr="done")}}
            manage.delete_lang(d, st, "post-1", "fr", yes=True)
            self.assertFalse((d / "output/post-1/fr").exists()); self.assertFalse(state.lang_done(st["posts"]["1"], "fr"))
            self.assertTrue(state.lang_done(st["posts"]["1"], "en"))
            manage.delete_post(d, st, "post-1", keep_ignored=True, yes=True)
            self.assertFalse((d / "output/post-1").exists()); self.assertFalse((d / "articles/post-1.md").exists())
            self.assertTrue(st["posts"]["1"]["ignored"])
            manage.set_ignored(st, "post-1", False); self.assertFalse(st["posts"]["1"]["ignored"])
            manage.delete_post(d, st, "post-1", yes=True); self.assertEqual(st["posts"], {})


if __name__ == "__main__":
    unittest.main()
