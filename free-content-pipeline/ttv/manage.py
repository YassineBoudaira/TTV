"""Housekeeping commands: disk usage, delete a post / a language, ignore a post, prune the archive and the cache."""
import shutil, time
from pathlib import Path
from . import state


def size(path):
    p = Path(path)
    if p.is_file():
        return p.stat().st_size
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) if p.exists() else 0


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024


def find(st, key):
    """A post by slug or id -> (id, record), or (None, None)."""
    for pid, rec in st["posts"].items():
        if key in (pid, rec.get("slug")):
            return pid, rec
    return None, None


def disk(root):
    root = Path(root)
    out = root / "output"
    rows = []
    for d in sorted(p for p in out.iterdir() if p.is_dir()) if out.exists() else []:
        rows.append((d.name, size(d)))
    for name in ("media", "articles", "voices"):
        rows.append((name + "/", size(root / name)))
    total, used, free = shutil.disk_usage(root)
    print(f"{'folder':46} size")
    for name, n in sorted(rows, key=lambda r: -r[1]):
        print(f"{name[:46]:46} {human(n)}")
    print(f"\nthis disk: {human(used)} used, {human(free)} free of {human(total)}")
    if free < 5 * 1024 ** 3:
        print("[!] less than 5 GB free: download your videos, then delete old folders (--delete-post, --prune-archive).")


def confirm(message, yes):
    print(message)
    if yes:
        return True
    return input("Type YES to continue: ").strip() == "YES"


def delete_post(root, st, key, include_archive=False, keep_ignored=False, yes=False):
    pid, rec = find(st, key)
    if not rec:
        print(f"[!] no post named '{key}' in state.json (see --status)"); return False
    slug, root = rec["slug"], Path(root)
    targets = [root / "output" / slug, root / "media" / slug, root / "articles" / f"{slug}.md", root / "articles" / f"{slug}.json"]
    targets += sorted((root / "output").glob(f"{slug}--rev*"))
    if include_archive:
        targets.append(root / "output" / "_archive" / slug)
    existing = [t for t in targets if t.exists()]
    listing = "\n".join(f"  - {t.relative_to(root)}  ({human(size(t))})" for t in existing) or "  (no files)"
    note = ("the post stays ignored: it will NOT be rebuilt." if keep_ignored else
            "it is still on your website, so the NEXT RUN WILL BUILD IT AGAIN (use --keep-ignored to prevent that).")
    if not confirm(f"This deletes post '{slug}':\n{listing}\nand forgets it in state.json; {note}", yes):
        print("cancelled"); return False
    for t in existing:
        shutil.rmtree(t) if t.is_dir() else t.unlink()
    if keep_ignored:
        st["posts"][pid] = {"slug": slug, "title": rec.get("title"), "link": rec.get("link"), "modified": None, "content_hash": None,
                            "revision": 1, "first_seen": rec.get("first_seen"), "langs": {}, "history": [], "ignored": True}
    else:
        del st["posts"][pid]
    print(f"[ok] deleted {slug}"); return True


def delete_lang(root, st, key, lang, yes=False):
    pid, rec = find(st, key)
    if not rec:
        print(f"[!] no post named '{key}' (see --status)"); return False
    target = Path(root) / "output" / rec["slug"] / lang
    if not confirm(f"This deletes the {lang} videos of '{rec['slug']}' ({human(size(target))}) and marks {lang} as not done.", yes):
        print("cancelled"); return False
    shutil.rmtree(target, ignore_errors=True)
    rec["langs"].pop(lang, None)
    print(f"[ok] deleted. The next run will rebuild {lang} for this post.  (or now:  --site --only {rec['slug']} --langs {lang})"); return True


def set_ignored(st, key, value):
    pid, rec = find(st, key)
    if not rec:
        print(f"[!] no post named '{key}' (see --status)"); return False
    rec["ignored"] = value
    print(f"[ok] {rec['slug']} is now {'IGNORED (never processed)' if value else 'active again'}"); return True


def prune_archive(root, days, yes=False):
    arch = Path(root) / "output" / "_archive"
    old = []
    for d in sorted(arch.glob("*/*")) if arch.exists() else []:
        if d.is_dir() and (time.time() - d.stat().st_mtime) > days * 86400:
            old.append(d)
    if not old:
        print(f"nothing in output/_archive is older than {days} days"); return
    if not confirm("This deletes old versions of edited posts:\n" + "\n".join(f"  - {d.relative_to(root)} ({human(size(d))})" for d in old), yes):
        print("cancelled"); return
    for d in old:
        shutil.rmtree(d, ignore_errors=True)
    print(f"[ok] deleted {len(old)} folder(s)")


def clean_cache(root, yes=False):
    c = Path(root) / "output" / "_cache"
    if not c.exists():
        print("no cache"); return
    if confirm(f"This deletes the research cache ({human(size(c))}). It is rebuilt when needed.", yes):
        shutil.rmtree(c, ignore_errors=True); print("[ok] cache cleaned")
