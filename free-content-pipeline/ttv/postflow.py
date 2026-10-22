"""One post -> all its languages: script -> art direction -> localization -> images -> voice -> video -> publish files."""
import hashlib, json
from pathlib import Path
from . import art, images, langs, llm as llmmod, render, scriptai, state, tts


def make_visuals(master, out_dir, media, cfg, use_ai):
    """One image per scene, made ONCE and shared by every language. AI image -> the article's own photo -> plain background."""
    assets = Path(out_dir) / "assets"; assets.mkdir(parents=True, exist_ok=True)
    art_scenes = (master.get("art") or {}).get("scenes")
    ai_ok = use_ai and bool(images.available(cfg))
    if use_ai and not ai_ok:
        print("  [images] no image provider is configured (add GEMINI_API_KEY or CLOUDFLARE_* in .env): using the article's own photos")
    paths, log = [], []
    for i, sc in enumerate(master["scenes"]):
        base = art_scenes[i]["prompt"] if art_scenes else sc.get("visual", "")
        prompt = art.final_prompt(base, cfg) if base else ""
        target = assets / f"scene_{i:02d}_{hashlib.md5(prompt.encode('utf-8')).hexdigest()[:8]}.jpg"
        source = "ai"
        if not target.exists():
            if ai_ok and prompt:
                print(f"  [image {i+1}/{len(master['scenes'])}] generating...")
                ok = images.generate(prompt, cfg, target)
            else:
                ok = False
            if not ok:
                source, target = ("article_photo", media[i % len(media)]) if media else ("none", None)
        paths.append(target)
        log.append({"scene": i + 1, "source": source, "file": str(target.name) if target else None, "prompt": prompt})
    (assets / "prompts.json").write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")
    n_ai = sum(1 for x in log if x["source"] == "ai")
    print(f"  [images] {n_ai} generated, {sum(1 for x in log if x['source'] == 'article_photo')} from the article's photos, "
          f"{sum(1 for x in log if x['source'] == 'none')} plain")
    return paths


def _publish_txt(ldir, script, link):
    tags = " ".join("#" + t for t in script["hashtags"])
    (ldir / "publish.txt").write_text(
        f"TITLE (YouTube):\n{script['title']}\n\nDESCRIPTION:\n{script['description']}" + (f"\n\n{link}" if link else "")
        + f"\n\nHASHTAGS:\n{tags}\n\nTIKTOK CAPTION:\n{script['tiktok_caption']} {tags}\n\n"
        f"INSTAGRAM CAPTION:\n{script['instagram_caption']}\n\n{tags}\n", encoding="utf-8")


def process_post(path, rec, want_langs, out_dir, cfg, ctx, flags, save):
    """Returns the languages finished in this run. `rec` (the state record) is updated and saved after every language."""
    text = Path(path).read_text(encoding="utf-8")
    title, body = scriptai.split_title(text, Path(path).stem)
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    slug = Path(path).stem
    meta_f = Path(path).with_suffix(".json")
    meta = json.loads(meta_f.read_text(encoding="utf-8")) if meta_f.exists() else {}
    llm_, tier = ctx["llm"], ctx["tier"]
    src, h = langs.detect(body), state.content_hash(title, body)
    print(f"\n=== {title[:80]}  (source language: {src}; making: {','.join(want_langs)}) ===")

    # ---- master script (cached; rebuilt when the text changes or when AI becomes available)
    mf, master = out / f"master_{src}.json", None
    if mf.exists():
        m = json.loads(mf.read_text(encoding="utf-8"))
        master = m if m.get("_hash") == h else None
        if master and master.get("_fallback") and llm_.available():
            print("[i] the saved script was the simple automatic one; AI is available now -> writing a real script")
            master = None
    fresh = master is None
    if fresh:
        try:
            if not llm_.available():
                raise llmmod.LLMError("no AI provider configured")
            master = scriptai.master_script(title, body, src, cfg["_site"], tier, llm_)
            print(f"[ok] script written by {llm_.last_used}: hook = \"{master['scenes'][0]['narration']}\"")
        except Exception as e:
            print(f"[!] AI script failed ({e}). Using the simple automatic script - quality is lower and other languages are skipped.")
            master = scriptai.fallback_script(title, body, src, cfg["_site"], tier)
            master["_fallback"] = True
        master["_hash"] = h
    # ---- art direction (understand the article, research, realistic prompts) - once per script
    wants_images = cfg["ai_images"] and not flags.no_ai_images and bool(images.available(cfg))
    if "art" not in master and not master.get("_fallback") and wants_images:      # no image provider = prompts would be wasted
        master["art"] = art.direct(title, body, master, tier, llm_, cfg, Path(cfg["_root"]) / "output" / "_cache" / "research")
        if master["art"]:
            print(f"[ok] art direction by {llm_.last_used}: subject = \"{master['art']['analysis']['subjects'][:90]}\" "
                  f"({len(master['art']['sources'])} research sources)")
        else:
            master["art"] = None
    if not wants_images and "art" not in master and not master.get("_fallback"):
        print("[i] art direction skipped: no image provider is configured (add GEMINI_API_KEY or the CLOUDFLARE_* keys to .env)")
    mf.write_text(json.dumps(master, ensure_ascii=False, indent=1), encoding="utf-8")

    # ---- phase 1: every script first (so the AI model can be unloaded before the video work starts)
    scripts = {}
    for lang in want_langs:
        ldir = out / lang; ldir.mkdir(exist_ok=True)
        if lang == src:
            scripts[lang] = master
            (ldir / "script.json").write_text(json.dumps(master, ensure_ascii=False, indent=1), encoding="utf-8")
            continue
        if master.get("_fallback"):
            print(f"[!] skipped {lang}: needs an AI model for translation (not counted as a failure). Run:  bash scripts/install_ai.sh"); continue
        sf = ldir / "script.json"
        script = json.loads(sf.read_text(encoding="utf-8")) if sf.exists() else None
        if script and (script.get("_master") != h or not langs.is_lang(" ".join(x["narration"] for x in script["scenes"]), lang)):
            script = None
        if script is None:
            try:
                script = scriptai.localize(master, lang, llm_, src); script["_master"] = h
                sf.write_text(json.dumps(script, ensure_ascii=False, indent=1), encoding="utf-8")
                print(f"[ok] {langs.name(lang)} script localized by {llm_.last_used}")
            except Exception as e:
                state.mark_failed(rec, lang, f"translation: {e}"); save()
                n = rec["langs"][lang]["attempts"]
                print(f"[!] {lang}: translation failed (attempt {n}/{cfg['max_attempts']}): {str(e)[:160]}. No video is made in the wrong language.")
                continue
        scripts[lang] = script
        if flags.dry_run:
            print(f"  [{lang}] title: {script['title']}\n  [{lang}] hook : {script['scenes'][0]['narration']}")
    if flags.dry_run or not scripts:
        return []

    # ---- phase 2: images once, then voice + video per language
    llm_.unload()
    own = Path(cfg["_root"]) / "media" / slug
    media = sorted(p for p in (own.iterdir() if own.is_dir() else []) if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    bgs = make_visuals(master, out, media, cfg, cfg["ai_images"] and not flags.no_ai_images)
    done = []
    for lang, script in scripts.items():
        ldir = out / lang
        try:
            render.render_language(ldir, lang, script, bgs, cfg, tier, ctx["formats"], cfg["brand"], tts.speak, flags.keep_work)
        except Exception as e:
            state.mark_failed(rec, lang, f"render: {e}"); save()
            print(f"[!] {lang} failed (attempt {rec['langs'][lang]['attempts']}/{cfg['max_attempts']}): {str(e)[:200]}"); continue
        _publish_txt(ldir, script, meta.get("link", ""))
        state.mark_done(rec, lang); save()
        print(f"[done] {ldir}")
        done.append(lang)
    (out / "article.md").write_text(text, encoding="utf-8")
    return done
