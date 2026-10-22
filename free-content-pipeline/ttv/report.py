"""Human-readable reports: what will be done, what was edited, what happened in this run."""
import time
from pathlib import Path
from . import state

LABEL = {"new": "NEW", "edited": "EDITED", "partial": "RETRY (missing languages)", "forced": "FORCED (asked by you)"}


def print_plan(plan, want):
    r = plan["report"]
    print(f"[i] site check: {len(r['new'])} new, {len(r['edited'])} edited, {len(r['partial'])} incomplete, "
          f"{len(r['gave_up'])} given up, {len(r['meta'])} date-only change, {len(r['complete'])} already complete"
          + (f", {len(r['ignored'])} ignored" if r.get("ignored") else ""))
    for p in r["gave_up"]:
        print(f"    - gave up: {p['slug']}  (a language failed too many times; use --retry-failed after fixing the cause)")
    for pid, rec in plan["removed"]:
        print(f"    - no longer on the site: {rec.get('slug')} (its videos are kept)")
    if not plan["queue"]:
        print("[i] nothing to do: every post is already done.")
    for p, kind, langs in plan["queue"]:
        print(f"    -> {LABEL.get(kind, kind):26} {p['slug']}   languages: {','.join(langs)}")


def write_run_report(root, lines):
    d = Path(root) / "output" / "_reports"; d.mkdir(parents=True, exist_ok=True)
    f = d / f"run-{time.strftime('%Y%m%d-%H%M%S')}.md"
    f.write_text("# Run report\n\n" + "\n".join(lines) + "\n", encoding="utf-8")
    return f


def append_edit_log(root, text):
    d = Path(root) / "output" / "_reports"; d.mkdir(parents=True, exist_ok=True)
    with open(d / "edits.md", "a", encoding="utf-8") as f:
        f.write(f"\n## {state.now()}\n```\n{text}\n```\n")


def status_table(st, want=None):
    rows = []
    for pid, rec in sorted(st["posts"].items(), key=lambda kv: kv[1].get("slug") or ""):
        done = [l for l, v in rec["langs"].items() if v.get("status") == "done"]
        failed = {l: v for l, v in rec["langs"].items() if v.get("status") == "failed"}
        missing = [l for l in (want or []) if l not in done]
        flag = ("IGNORED" if rec.get("ignored") else "complete" if done and not failed and not missing
                else (f"partial (missing: {','.join(missing)})" if (done or failed) else "new"))
        rows.append((rec.get("slug") or pid, rec.get("revision", 1), ",".join(done) or "-",
                     ",".join(f"{l}({v.get('attempts', 0)}x)" for l, v in failed.items()) or "-", flag,
                     "; ".join(f"{l}: {v.get('last_error', '')[:70]}" for l, v in failed.items())))
    return rows
