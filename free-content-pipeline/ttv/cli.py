#!/usr/bin/env python3
"""Command line: article -> videos in several languages. Run:  python pipeline.py --help"""
import argparse, json, shutil, sys
from pathlib import Path
from . import doctor as dr, hw, langs, llm as llmmod, manage, postflow, report, state, wpsync
from .config import ROOT, load_config


def need_ffmpeg():
    for t in ("ffmpeg", "ffprobe"):
        if not shutil.which(t):
            sys.exit(f"[!] '{t}' not found. Install FFmpeg (Ubuntu: apt install ffmpeg | Windows: winget install Gyan.FFmpeg)")


def read_old_article(slug):
    f = ROOT / "articles" / f"{slug}.md"
    if not f.exists():
        return "", ""
    lines = f.read_text(encoding="utf-8").splitlines()
    title = lines[0].lstrip("# ").strip() if lines else ""
    return title, "\n".join(lines[1:])


def handle_edit(p, rec, cfg, apply):
    """The text of a post changed. Show what changed, keep the old videos, return the folder for the new ones."""
    slug = p["slug_safe"]
    old_title, old_text = read_old_article(slug)
    summary = state.diff_summary(old_title or rec.get("title") or "", old_text, p["title"], p["text"])
    text = state.format_edit(slug, rec["revision"], summary)
    print("\n" + text)
    report.append_edit_log(ROOT, text)
    if not apply:
        return None
    mode, rev = cfg["on_edit"], rec["revision"]
    archived = None
    if mode == "new_folder":
        out_dir = ROOT / "output" / f"{slug}--rev{rev + 1}"
        print(f"  -> the old videos stay in output/{slug}/ ; the new ones go to {out_dir.name}/")
    else:
        archived = state.archive_outputs(ROOT / "output", slug, rev)
        out_dir = ROOT / "output" / slug
        if archived:
            old_md = ROOT / "articles" / f"{slug}.md"
            if old_md.exists():
                shutil.copy(old_md, archived / "article_old.md")
            print(f"  -> the old videos were moved to output/_archive/{slug}/{archived.name}/")
    rec["history"].append({"revision": rev, "hash": rec.get("content_hash"), "title": rec.get("title"), "at": state.now(),
                           "archived": str(archived) if archived else None, "summary": summary})
    rec.update(revision=rev + 1, langs={}, content_hash=p["hash"], title=p["title"], modified=p["modified"])
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "CHANGELOG.md", "a", encoding="utf-8") as f:
        f.write(f"\n## revision {rev + 1} - {state.now()}\n\n```\n{text}\n```\n" + (f"\nOld version: `{archived}`\n" if archived else ""))
    return out_dir


def main():
    ap = argparse.ArgumentParser(prog="pipeline.py", description="Free article -> multilingual video pipeline")
    ap.add_argument("files", nargs="*", help="article .md/.txt files (without --site)")
    ap.add_argument("--site", nargs="?", const="cfg", help="read the posts of a WordPress site (default: site_url in config.json)")
    ap.add_argument("--limit", type=int, default=None, help="max posts per run (0 = all). Finished posts are skipped automatically")
    ap.add_argument("--only", help="work only on this post (slug or id), even if it is finished")
    ap.add_argument("--force", action="store_true", help="also redo finished posts (after the new ones)")
    ap.add_argument("--retry-failed", action="store_true", help="try again the languages that failed too many times")
    ap.add_argument("--on-edit", choices=["archive", "new_folder", "report_only"], help="what to do with edited posts")
    ap.add_argument("--apply-edits", action="store_true", help="with --on-edit report_only: now rebuild the edited posts")
    ap.add_argument("--langs", help="e.g. en,fr,ar,es")
    ap.add_argument("--formats", help="wide,tall (default both)")
    ap.add_argument("--profile", help="auto, lite, standard, strong, max")
    ap.add_argument("--no-ai-images", action="store_true")
    ap.add_argument("--dry-run", action="store_true", help="only write the scripts (no video, state not changed)")
    ap.add_argument("--keep-work", action="store_true")
    ap.add_argument("--status", action="store_true", help="show every known post: languages done / failed")
    ap.add_argument("--disk", action="store_true", help="show the size of every post folder and the free disk space")
    ap.add_argument("--delete-post", metavar="SLUG", help="delete the videos, photos and article of a post and forget it")
    ap.add_argument("--delete-lang", nargs=2, metavar=("SLUG", "LANG"), help="delete one language of a post (it is rebuilt on the next run)")
    ap.add_argument("--ignore-post", metavar="SLUG", help="never process this post")
    ap.add_argument("--unignore-post", metavar="SLUG", help="process this post again")
    ap.add_argument("--prune-archive", type=int, metavar="DAYS", help="delete archived old versions older than DAYS days")
    ap.add_argument("--clean-cache", action="store_true", help="delete the research cache")
    ap.add_argument("--include-archive", action="store_true", help="with --delete-post: also delete its archived versions")
    ap.add_argument("--keep-ignored", action="store_true", help="with --delete-post: keep it ignored so it is NOT rebuilt")
    ap.add_argument("--yes", action="store_true", help="do not ask for confirmation")
    ap.add_argument("--doctor", action="store_true", help="check this machine and the configuration")
    ap.add_argument("--test-ai", action="store_true", help="translate a test sentence into every language")
    ap.add_argument("--install-ai", action="store_true", help="download the free local AI model (Ollama)")
    ap.add_argument("--print-ai-model", action="store_true")
    a = ap.parse_args()
    cfg = load_config()
    if a.on_edit:
        cfg["on_edit"] = a.on_edit
    h = hw.detect()
    tier_name, tier = hw.choose(h, a.profile or cfg["profile"])
    ctx = {"hw": h, "tier": tier, "tier_name": tier_name, "llm": llmmod.LLM(cfg, tier), "root": ROOT,
           "formats": [x.strip() for x in a.formats.split(",")] if a.formats else cfg["formats"]}
    want = [x.strip() for x in a.langs.split(",")] if a.langs else cfg["target_langs"]
    if a.print_ai_model:
        print(llmmod.recommended_model(tier)); return
    if a.install_ai:
        sys.exit(0 if llmmod.install_ollama_model(tier) else 1)
    if a.status:
        dr.status(ROOT, want); return
    if a.disk:
        manage.disk(ROOT); return
    if a.prune_archive is not None:
        manage.prune_archive(ROOT, a.prune_archive, a.yes); return
    if a.clean_cache:
        manage.clean_cache(ROOT, a.yes); return
    if a.delete_post or a.delete_lang or a.ignore_post or a.unignore_post:
        st = state.load(ROOT)
        if a.delete_post:
            ok = manage.delete_post(ROOT, st, a.delete_post, a.include_archive, a.keep_ignored, a.yes)
        elif a.delete_lang:
            ok = manage.delete_lang(ROOT, st, a.delete_lang[0], a.delete_lang[1], a.yes)
        else:
            ok = manage.set_ignored(st, a.ignore_post or a.unignore_post, bool(a.ignore_post))
        if ok:
            state.save(ROOT, st)
        return
    if a.doctor or a.test_ai:
        dr.doctor(cfg, ctx)
        if a.test_ai or ctx["llm"].available():
            print("\nTranslation test:"); dr.test_ai(cfg, ctx, want)
        return
    need_ffmpeg()
    bad = [x for x in want if x not in langs.LANGS]
    if bad:
        sys.exit(f"[!] unknown language(s): {bad}. Available: {list(langs.LANGS)}")
    print(f"[i] profile {tier_name} ({h['ram_gb']} GB RAM, {h['cores']} cores) | AI text: {ctx['llm'].describe()} | languages: {','.join(want)}")
    if not ctx["llm"].available() and len(want) > 1:
        print("\n" + "!" * 78 + "\n[!] NO AI TEXT MODEL FOUND -> videos in other languages CANNOT be made and the script is the simple one.\n"
              "    Free fix, no key (once):  bash scripts/install_ai.sh      Or add GEMINI_API_KEY to .env\n" + "!" * 78 + "\n")
    (ROOT / "articles").mkdir(exist_ok=True); (ROOT / "media").mkdir(exist_ok=True)
    lines = []

    # ------------------------------------------------------------ manual mode: article files
    if not a.site:
        if not a.files:
            ap.print_help(); sys.exit("\n[!] give article files, or use --site")
        for f in a.files:
            path = Path(f)
            rec = state.new_record({"slug": path.stem, "title": path.stem, "link": "", "modified": "", "hash": ""})
            postflow.process_post(path, rec, want, ROOT / "output" / path.stem, cfg, ctx, a, lambda: None)
        return

    # ------------------------------------------------------------ site mode: only what is new / edited / incomplete
    base = cfg["site_url"] if a.site == "cfg" else a.site
    if not base:
        sys.exit("[!] set site_url in config.json or use --site https://example.com")
    st = state.load(ROOT)
    posts = wpsync.fetch_posts(base)
    if not posts:                                              # never mistake a network problem for "all done" or "all deleted"
        sys.exit(f"[!] could not read any post from {base}. Check the internet, the address, and that the site has published posts "
                 "(open "+base+"/wp-json/wp/v2/posts in a browser). Nothing was changed.")
    for p in posts:                                            # a post that came back is no longer 'removed'
        if p["id"] in st["posts"]:
            st["posts"][p["id"]].pop("removed", None)
    if cfg["order"] == "oldest":
        posts = list(reversed(posts))
    limit = cfg["posts_per_run"] if a.limit is None else a.limit
    plan = state.plan(posts, st, want, limit=limit, only=a.only, force=a.force, retry_failed=a.retry_failed,
                      max_attempts=cfg["max_attempts"], edit_mode=cfg["on_edit"], apply_edits=a.apply_edits,
                      can_translate=ctx["llm"].available(), detect=langs.detect)
    report.print_plan(plan, want)
    queued = {p["id"] for p, _, _ in plan["queue"]}
    for p in plan["report"]["edited"]:                         # edited but waiting for your decision
        if p["id"] not in queued:
            if st["posts"][p["id"]].get("slug"):
                p["slug_safe"] = st["posts"][p["id"]]["slug"]
            handle_edit(p, st["posts"][p["id"]], cfg, apply=False)
            print("  -> waiting: run with --apply-edits to rebuild it (or set on_edit to archive / new_folder)")
    for p in plan["report"]["meta"]:                           # only the date changed: nothing to redo
        rec = st["posts"][p["id"]]
        print(f"[i] {p['slug']}: only the 'modified' date changed, the text is identical -> nothing to redo")
        rec["modified"] = p["modified"]
    for pid, rec in plan["removed"]:
        rec["removed"] = True
    if not a.dry_run:
        state.save(ROOT, st)

    for p, kind, todo in plan["queue"]:
        rec = st["posts"].get(p["id"])
        if rec and rec.get("slug"):
            p["slug_safe"] = rec["slug"]                       # the folder name never changes, even if the permalink does
        out_dir = ROOT / "output" / p["slug_safe"]
        if kind == "edited":
            if a.dry_run:
                handle_edit(p, rec, cfg, apply=False)
                print("  (dry-run: nothing was moved or rebuilt)")
                continue
            out_dir = handle_edit(p, rec, cfg, apply=True) or out_dir
        elif rec is None:
            rec = st["posts"][p["id"]] = state.new_record(p)
        elif kind == "forced":
            todo = list(want)
            for l in todo:
                rec["langs"].pop(l, None)                      # only the languages being redone are reset
        rec.update(slug=p["slug_safe"], title=p["title"], link=p["link"], modified=p["modified"], content_hash=p["hash"])
        path, n = wpsync.save_post(p, ROOT, int(cfg["max_images"]), refresh_images=(kind == "edited"))
        if not a.dry_run:
            state.save(ROOT, st)
        try:
            done = postflow.process_post(path, rec, todo, out_dir, cfg, ctx, a, (lambda: None) if a.dry_run else (lambda: state.save(ROOT, st)))
        except KeyboardInterrupt:
            raise
        except Exception as e:                                 # a bug or a bad answer must never loop on the same post
            import traceback
            print(f"\n[!] unexpected error on '{p['slug_safe']}': {type(e).__name__}: {e}\n" + "".join(traceback.format_exc().splitlines(True)[-6:]))
            for l in todo:
                if not state.lang_done(rec, l):
                    state.mark_failed(rec, l, f"crash: {type(e).__name__}: {e}")
            if not a.dry_run:
                state.save(ROOT, st)
            done = []
        lines.append(f"- {p['slug_safe']} [{kind}]: finished {','.join(done) or 'nothing'}; "
                     f"failed {','.join(l for l in todo if rec['langs'].get(l, {}).get('status') == 'failed') or '-'}")
    if lines and not a.dry_run:
        print("\n[i] report:", report.write_run_report(ROOT, lines))
    print("\n[done] finished. Results are in the 'output' folder (one folder per article, one per language). "
          "Check the state with:  ./venv/bin/python pipeline.py --status")


if __name__ == "__main__":
    main()
