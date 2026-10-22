"""Things that must never crash the run: wrong settings, verbose model answers, a crash inside one post."""
import json, os, sys, tempfile, unittest
from pathlib import Path
from unittest import mock
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ttv import scriptai, state


class Config(unittest.TestCase):
    def load(self, user):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "c.json"; f.write_text(json.dumps(user))
            with mock.patch.dict(os.environ, {"PIPELINE_CONFIG": str(f), "TTV_HOME": d}):
                from ttv import config
                return config.load_config()

    def test_research_true_is_converted(self):                    # the crash seen on the server
        cfg = self.load({"research": True})
        self.assertEqual(cfg["research"], {"wikipedia": True, "web": True})

    def test_wrong_types_fall_back_to_defaults(self):
        cfg = self.load({"llm": "gemini", "target_langs": "en", "minis": "yes", "posts_per_run": 2})
        self.assertIsInstance(cfg["llm"], dict); self.assertEqual(cfg["target_langs"], ["en", "fr", "ar", "es"])
        self.assertIs(cfg["minis"], True); self.assertEqual(cfg["posts_per_run"], 2)

    def test_broken_json_gives_a_clear_message(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "c.json"; f.write_text('{"a": 1,}')
            with mock.patch.dict(os.environ, {"PIPELINE_CONFIG": str(f), "TTV_HOME": d}):
                from ttv import config
                with self.assertRaises(SystemExit) as e:
                    config.load_config()
                self.assertIn("not valid JSON", str(e.exception))


class SmallModelAnswers(unittest.TestCase):
    def test_tags_are_extracted(self):
        raw = "Okay, here's the translation:\n\n<t>Les chiens ont besoin d'eau fraîche chaque jour.</t>\n\nNotes: I kept it simple."
        self.assertEqual(scriptai._clean_translation(raw), "Les chiens ont besoin d'eau fraîche chaque jour.")

    def test_options_and_intro_are_dropped_without_tags(self):
        raw = "Here are a few options:\n\n**Option 1:** Los perros necesitan agua fresca todos los días.\n\n**Option 2:** Los perros requieren agua limpia."
        self.assertEqual(scriptai._clean_translation(raw), "Los perros necesitan agua fresca todos los días.")

    def test_plain_answer_and_quotes(self):
        self.assertEqual(scriptai._clean_translation('"Les chiens boivent de l\'eau."'), "Les chiens boivent de l'eau.")
        self.assertEqual(scriptai._clean_translation("Traduction : Les chiens boivent de l'eau."), "Les chiens boivent de l'eau.")


class OnePostCrashes(unittest.TestCase):
    def test_a_crash_is_recorded_and_the_run_goes_on(self):
        from ttv import cli, wpsync, postflow
        post = lambda i: {"id": str(i), "slug": f"p{i}", "slug_safe": f"p{i}", "title": "T", "text": "Dogs drink water.", "link": "",
                          "modified": "m", "hash": f"h{i}", "imgs": [], "featured": "", "date": ""}
        with tempfile.TemporaryDirectory() as d, mock.patch.dict(os.environ, {"TTV_HOME": d, "PIPELINE_CONFIG": "/nonexistent"}):
            for k in ("GEMINI_API_KEY", "LLM_API_KEY", "ANTHROPIC_API_KEY"):
                os.environ.pop(k, None)
            import importlib
            from ttv import config
            importlib.reload(config); importlib.reload(cli)
            with mock.patch.object(cli.wpsync, "fetch_posts", return_value=[post(1), post(2)]), \
                 mock.patch.object(cli.postflow, "process_post", side_effect=RuntimeError("boom")), \
                 mock.patch.object(sys, "argv", ["pipeline.py", "--site", "http://x", "--langs", "en,fr", "--limit", "0"]):
                cli.main()
            st = state.load(Path(d))
            self.assertEqual(sorted(st["posts"]), ["1", "2"])                       # the second post was still tried
            self.assertEqual(st["posts"]["1"]["langs"]["en"]["attempts"], 1)
            self.assertIn("boom", st["posts"]["1"]["langs"]["en"]["last_error"])


class Classification(unittest.TestCase):
    def test_known_post_without_any_language_is_new_not_retry(self):
        p = {"id": "1", "slug": "a", "title": "T", "link": "", "modified": "m", "text": "x", "hash": "h"}
        rec = state.new_record(p)
        self.assertEqual(state.classify(p, rec, ["en", "fr"], 3)[0], "new")


if __name__ == "__main__":
    unittest.main()
