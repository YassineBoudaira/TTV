"""--doctor, --test-ai, --status."""
import shutil
from . import images, langs, llm as llmmod, render, scriptai, state, tts
from .report import status_table


def doctor(cfg, ctx):
    h, tier = ctx["hw"], ctx["tier"]
    print(f"Machine : {h['ram_gb']} GB RAM, {h['cores']} CPU cores, GPU memory {h['vram_gb']} GB")
    print(f"Profile : {ctx['tier_name']}  -> video {tier['wide'][0]}x{tier['wide'][1]} @ {tier['fps']} fps, up to {tier['max_scenes']} scenes, local AI model {llmmod.recommended_model(tier)}")
    print(f"FFmpeg  : {'ok' if shutil.which('ffmpeg') else 'MISSING'}")
    print(f"AI text : {ctx['llm'].describe()}")
    for n in ctx["llm"].notes:
        print(f"          - {n}")
    if not ctx["llm"].available():
        print("          => NO AI: only the article's own language can be made. Fix (free, no key):  bash scripts/install_ai.sh")
    prov = images.available(cfg)
    print(f"AI image: {', '.join(prov) or 'NONE -> the article own photos are used'}")
    if not prov:
        print("          add GEMINI_API_KEY (Nano Banana) or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (FLUX, free 10,000 neurons/day) to .env")
    web = "Gemini + Google Search" if ctx["llm"].can_search_web() else "Wikipedia only (add GEMINI_API_KEY for web search)"
    print(f"Research: {web}   | art director: {'on' if cfg.get('art_director', True) else 'off'}")
    for code, d in langs.LANGS.items():
        f = render.find_font(cfg, 40, d["sample"])
        ok = render._covers(getattr(f, "path", ""), "".join(sorted(set(d["sample"].replace(" ", ""))))) if hasattr(f, "path") else False
        print(f"{d['name']:8}: voice = {tts.engine_for(code, cfg):22} font = {'ok' if ok else 'NO FONT WITH THESE LETTERS'}")
    if tts.engine_for("ar", cfg).startswith(("piper", "espeak", "silent")):
        print("          note: Arabic with Piper/espeak sounds choppy. Better: AZURE_SPEECH_KEY (free 500k chars/month) or  pip install edge-tts")
    print(f"Site    : {cfg['site_url'] or '(not set)'}")
    st = state.load(ctx["root"])
    print(f"State   : {len(st['posts'])} post(s) known (see:  --status)")


def test_ai(cfg, ctx, want):
    """Translate one real sentence into every wanted language and show it, so YOU can judge the quality."""
    if not ctx["llm"].available():
        print("[!] no AI provider: translation cannot work. Run:  bash scripts/install_ai.sh"); return False
    sample = {"title": "Why your dog needs fresh water", "hashtags": [],
              "scenes": [{"narration": "Dogs need fresh water every day, and the bowl must be cleaned with soap.", "visual": ""}] * 3}
    ok = True
    for lang in [l for l in want if l != "en"]:
        try:
            out = scriptai.localize(sample, lang, ctx["llm"], "en")
            print(f"[ok] {langs.name(lang):8}: {out['scenes'][0]['narration']}   (by {ctx['llm'].last_used})")
        except Exception as e:
            ok = False; print(f"[!] {langs.name(lang):8}: FAILED - {e}")
    return ok


def status(root, want=None):
    st = state.load(root)
    if not st["posts"]:
        print("No post has been processed yet."); return
    print(f"{'post':44} {'rev':>3}  {'done':14} {'failed':14} state")
    for slug, rev, done, failed, flag, err in status_table(st, want):
        print(f"{slug[:44]:44} {rev:>3}  {done:14} {failed:14} {flag}")
        if err:
            print(f"{'':50}last error: {err}")
