"""Paths, defaults, .env and config.json loading."""
import json, os, urllib.parse
from pathlib import Path

# TTV_HOME lets you keep the data (articles, output, state, .env) in another folder (used by the tests)
ROOT = Path(os.environ.get("TTV_HOME") or Path(__file__).resolve().parent.parent).resolve()

DEFAULTS = {
    # --- site and output
    "site_url": "", "brand": "", "target_langs": ["en", "fr", "ar", "es"], "formats": ["wide", "tall"],
    "profile": "auto", "posts_per_run": 3, "order": "newest", "max_images": 8,
    "short_max_seconds": 58, "mini_seconds": 35, "minis": True, "music": True,
    # --- what to do with posts
    "on_edit": "archive",          # archive | new_folder | report_only   (what happens when a post is edited)
    "max_attempts": 3,             # a language that failed this many times is skipped until --retry-failed
    # --- images
    "ai_images": True, "image_providers": ["gemini", "cloudflare"],
    "image_style": ("ultra realistic documentary photograph, shot on a full-frame camera, 85mm lens, f/2, natural light, "
                    "true-to-life colors, sharp focus on the subject, fine natural detail"),
    "image_negative": ("no illustration, no cartoon, no 3d render, no text, no letters, no logos, no watermark, "
                       "no extra limbs, no distorted anatomy"),
    "gemini_image_model": "gemini-2.5-flash-image",
    "cloudflare_model": "@cf/black-forest-labs/flux-1-schnell", "cloudflare_steps": 6,
    "art_director": True,          # an AI step that studies the article and writes realistic image prompts
    "research": {"wikipedia": True, "web": True},
    # --- text AI
    "llm": {"order": ["gemini", "openai", "anthropic", "ollama"],
            "gemini": {"model": "gemini-2.5-flash"},
            "openai": {"base": "https://api.groq.com/openai/v1", "model": "llama-3.3-70b-versatile"},
            "anthropic": {"model": "claude-sonnet-5-5"}, "ollama": {"url": "http://localhost:11434", "model": "auto"}},
    # --- voice
    "tts_order": ["azure", "edge", "piper", "sapi", "espeak"], "tts_order_by_lang": {}, "tts_voices": {},
    "gemini_tts_model": "gemini-2.5-flash-preview-tts",
    "piper_exe": "", "piper_models": {}, "sapi_voices": {},
    "gap_sentence": 0.45, "gap_clause": 0.28, "loudness": -16, "transition": 0.0, "font": "",
}


def deep_merge(a, b):
    out = dict(a)
    for k, v in b.items():
        out[k] = deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def load_env():
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                if v.strip().strip('"').strip("'"):
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _fix_types(cfg, user):
    """A setting of the wrong type must never crash the run: keep the default and say so."""
    notes = []
    if isinstance(user.get("research"), bool):                       # research: true  ->  both sources on / off
        cfg["research"] = {"wikipedia": user["research"], "web": user["research"]}
        notes.append("'research' was true/false: converted to {wikipedia, web}")
    for k, d in DEFAULTS.items():
        v = cfg.get(k)
        bad = ((isinstance(d, dict) and not isinstance(v, dict)) or (isinstance(d, list) and not isinstance(v, list))
               or (isinstance(d, bool) and not isinstance(v, bool)) or (isinstance(d, str) and not isinstance(v, str)))
        if bad:
            cfg[k] = d
            notes.append(f"'{k}' has the wrong type ({type(v).__name__}): using the default")
    return notes


def load_config():
    load_env()
    p = Path(os.environ.get("PIPELINE_CONFIG") or ROOT / "config.json")
    try:
        user = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    except ValueError as e:
        raise SystemExit(f"[!] {p} is not valid JSON ({e}). Fix it (a comma or a quote is wrong) or restore it with: cp config.json.bak config.json")
    cfg = deep_merge(DEFAULTS, user)
    for note in _fix_types(cfg, user):
        print(f"[i] config.json: {note}")
    host = urllib.parse.urlparse(cfg["site_url"]).netloc
    if cfg["brand"] in ("", "my-website.com"):
        cfg["brand"] = host
    cfg["_root"], cfg["_site"] = str(ROOT), host
    return cfg
