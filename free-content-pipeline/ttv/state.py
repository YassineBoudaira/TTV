"""Post lifecycle: which posts are new, edited, partly done, finished or given up.  (state.json, version 2)

A post is always in ONE of these kinds:
  new       never seen before
  edited    text changed since the last run (detected by a hash of the text, not by the modified date)
  partial   some wanted language is missing and still has attempts left
  gave_up   a language failed `max_attempts` times (skipped until --retry-failed or an edit)
  meta      only the 'modified' date changed (plugin, category...) - the text is identical: nothing to redo
  complete  every wanted language is done
"""
import difflib, hashlib, json, re, shutil, time
from pathlib import Path

VERSION = 2


def now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def content_hash(title, text):
    return hashlib.md5((re.sub(r"\s+", " ", title).strip() + "\n" + re.sub(r"\s+", " ", text).strip()).encode("utf-8")).hexdigest()


# ------------------------------------------------------------------ file
def _migrate(raw):
    if raw.get("_version") == VERSION:
        return raw
    posts = {}
    for pid, st in raw.items():                       # version 1 was {id: {langs: [..], modified, slug}}
        if not isinstance(st, dict):
            continue
        posts[pid] = {"slug": st.get("slug"), "title": None, "link": None, "modified": st.get("modified"),
                      "content_hash": None, "revision": 1, "first_seen": None, "history": [],
                      "langs": {l: {"status": "done", "at": None} for l in st.get("langs", [])}}
    return {"_version": VERSION, "posts": posts}


def load(root):
    f = Path(root) / "state.json"
    return _migrate(json.loads(f.read_text(encoding="utf-8"))) if f.exists() else {"_version": VERSION, "posts": {}}


def save(root, st):
    f = Path(root) / "state.json"
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(f)                                    # atomic: a killed run never leaves a broken file


def new_record(p):
    return {"slug": p["slug"], "title": p["title"], "link": p["link"], "modified": p["modified"], "content_hash": p["hash"],
            "revision": 1, "first_seen": now(), "langs": {}, "history": []}


# ------------------------------------------------------------------ language bookkeeping
def lang_done(rec, lang):
    return rec["langs"].get(lang, {}).get("status") == "done"


def mark_done(rec, lang):
    rec["langs"][lang] = {"status": "done", "at": now(), "revision": rec["revision"]}


def mark_failed(rec, lang, error):
    old = rec["langs"].get(lang, {})
    rec["langs"][lang] = {"status": "failed", "attempts": old.get("attempts", 0) + 1,
                          "last_error": str(error)[:240], "at": now()}


# ------------------------------------------------------------------ classification
def classify(p, rec, want, max_attempts):
    """Return (kind, langs_to_do)."""
    if rec is None:
        return "new", list(want)
    if rec.get("content_hash") and rec["content_hash"] != p["hash"]:
        return "edited", list(want)
    if not rec.get("content_hash"):                    # state from an older version: adopt the current text silently
        rec["content_hash"] = p["hash"]
    if not rec.get("langs"):                           # known, but nothing was ever finished or attempted
        return "new", list(want)
    missing = [l for l in want if not lang_done(rec, l)]
    retry = [l for l in missing if rec["langs"].get(l, {}).get("attempts", 0) < max_attempts]
    if retry:
        return "partial", retry
    if missing:
        return "gave_up", missing
    return ("meta" if rec.get("modified") != p["modified"] else "complete"), []


def plan(site_posts, state, want, *, limit=0, only=None, force=False, retry_failed=False, max_attempts=3,
         edit_mode="archive", apply_edits=False, can_translate=True, detect=None):
    """Decide what to do. Returns {"queue": [(post, kind, langs)], "report": {kind: [post...]}, "removed": [...]}.
    The queue order is: new, edited, partial. Finished posts are never in it (unless --only/--force)."""
    posts = state["posts"]
    if retry_failed:
        for rec in posts.values():
            for l in rec["langs"].values():
                if l.get("status") == "failed":
                    l["attempts"] = 0
    report = {k: [] for k in ("new", "edited", "partial", "gave_up", "meta", "complete", "ignored")}
    queue = {"new": [], "edited": [], "partial": [], "forced": []}
    for p in site_posts:
        if only and only not in (p["slug"], p["id"]):
            continue
        rec = posts.get(p["id"])
        if rec and rec.get("ignored") and not (only and only in (p["slug"], p["id"])):
            report.setdefault("ignored", []).append(p)
            continue
        w = list(want)
        if not can_translate and detect:               # without an AI model only the article's own language is possible
            src = detect(p["text"])
            if len(w) > 1:
                w = [x for x in w if x == src] or w[:1]
        kind, todo = classify(p, rec, w, max_attempts)
        report.setdefault(kind, []).append(p)
        if only or force:                              # explicit request: do it even when finished
            if kind in ("complete", "meta", "gave_up"):
                queue["forced"].append((p, "forced", list(want)))
                continue
        if kind == "edited" and edit_mode == "report_only" and not apply_edits:
            continue
        if kind in queue:
            queue[kind].append((p, kind, todo))
    ordered = queue["new"] + queue["edited"] + queue["partial"] + queue["forced"]
    if limit:
        ordered = ordered[:limit]
    site_ids = {p["id"] for p in site_posts}
    removed = [(pid, r) for pid, r in posts.items() if pid not in site_ids and not r.get("removed")]
    return {"queue": ordered, "report": report, "removed": removed}


# ------------------------------------------------------------------ edits
def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?؟])\s+|\n+", text) if len(s.strip()) > 2]


def diff_summary(old_title, old_text, new_title, new_text):
    a, b = sentences(old_text), sentences(new_text)
    sa, sb = set(a), set(b)
    added, removed = [s for s in b if s not in sa], [s for s in a if s not in sb]
    ratio = difflib.SequenceMatcher(None, " ".join(a), " ".join(b)).quick_ratio() if a and b else 0.0
    return {"title_changed": old_title != new_title, "old_title": old_title, "new_title": new_title,
            "added": len(added), "removed": len(removed), "similarity": round(ratio, 2),
            "examples_added": [s[:140] for s in added[:3]], "examples_removed": [s[:140] for s in removed[:3]]}


def format_edit(slug, rev_old, summary):
    lines = [f"EDITED: {slug}  (revision {rev_old} -> {rev_old + 1})"]
    if summary["title_changed"]:
        lines.append(f"  title : \"{summary['old_title']}\"  ->  \"{summary['new_title']}\"")
    lines.append(f"  text  : {summary['added']} sentence(s) added, {summary['removed']} removed, similarity {int(summary['similarity'] * 100)}%")
    lines += [f"  + {s}" for s in summary["examples_added"]] + [f"  - {s}" for s in summary["examples_removed"]]
    return "\n".join(lines)


def archive_outputs(out_root, slug, revision):
    """Move output/<slug>/ to output/_archive/<slug>/rev<N>_<time>/ so nothing is ever lost."""
    src = Path(out_root) / slug
    if not src.exists() or not any(src.iterdir()):
        return None
    dst = Path(out_root) / "_archive" / slug / f"rev{revision}_{time.strftime('%Y%m%d-%H%M%S')}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return dst
