"""Editorial brain: read the article, write a video script with a hook, then localize it per language."""
import json, re
from . import langs
from .llm import LLMError

SYSTEM = ("You are a senior short-form video producer and scriptwriter for a pets and animals website. "
          "You turn blog articles into engaging, accurate videos for YouTube, YouTube Shorts, TikTok and Instagram "
          "Reels. You always answer with a single valid JSON object and nothing else.")


def split_title(text, fallback):
    lines = text.strip().splitlines()
    if lines and lines[0].lstrip().startswith("#"):
        return lines[0].lstrip("# ").strip(), "\n".join(lines[1:]).strip()
    return fallback.replace("-", " ").replace("_", " "), text.strip()


def _clean(s):
    return re.sub(r"\s+", " ", re.sub(r"[*_#`>]+", "", str(s))).strip()


def normalize(d, want_scenes=None):
    """Make the model's answer safe to use, or raise ValueError."""
    scenes = []
    for s in d.get("scenes", []):
        if isinstance(s, str):
            s = {"narration": s}
        n = _clean(s.get("narration", ""))
        if n:
            scenes.append({"narration": n, "visual": _clean(s.get("visual", ""))})
    if len(scenes) < 3:
        raise ValueError("too few scenes")
    if want_scenes and len(scenes) != want_scenes:
        raise ValueError(f"expected {want_scenes} scenes, got {len(scenes)}")
    tags = [re.sub(r"[#\s]+", "", str(t)) for t in d.get("hashtags", []) if str(t).strip()]
    return {"title": _clean(d.get("title", ""))[:100], "scenes": scenes,
            "description": _clean(d.get("description", "")), "hashtags": tags[:12],
            "tiktok_caption": _clean(d.get("tiktok_caption", "")), "instagram_caption": _clean(d.get("instagram_caption", ""))}


def master_script(title, body, lang, site, tier, llm):
    n_max = tier["max_scenes"]
    n_min = max(5, n_max - 3)
    prompt = f"""Language of the narration: {langs.name(lang)}.
Website: {site}
Article title: {title}
Article text:
\"\"\"
{body[:tier['article_chars']]}
\"\"\"

Write the video script.
Rules:
- First read and understand the whole article. Use ONLY facts, numbers and advice that appear in the article. Never invent health, feeding or medical claims.
- Scene 1 is a HOOK (max 12 words): a surprising question, a bold promise or a common mistake. Never start with "Hello", "Welcome" or "In this video".
- Between {n_min} and {n_max} scenes. Each scene is ONE idea, spoken narration of 10 to 24 words, simple spoken language, no emojis, no markdown, no hard abbreviations.
- The last scene is a call to action inviting viewers to read the full guide on the website.
- "visual": an English image-generation prompt for that scene (concrete subject, setting, lighting, camera angle; photorealistic; NO text, letters, logos or watermarks).
- "title": max 70 characters, curiosity-driven, with the main keyword.
- "description": 2 to 3 sentences for YouTube with keywords, ending with a line inviting viewers to read the article.
- "hashtags": 8 relevant hashtags without the # sign.
- "tiktok_caption" and "instagram_caption": short captions (max 150 characters) starting with a hook.

Return JSON exactly like: {{"title": "", "scenes": [{{"narration": "", "visual": ""}}], "description": "", "hashtags": [], "tiktok_caption": "", "instagram_caption": ""}}"""
    def check(d):
        out = normalize(d)
        if not langs.is_lang(" ".join(sc["narration"] for sc in out["scenes"]), lang):
            raise ValueError(f"the narration must be written in {langs.name(lang)}")
        return out
    return llm.ask(prompt, SYSTEM, True, 4096, validate=check, temperature=0.6)


LOCAL_SYSTEM = ("You are a professional translator and voice-over editor for pet and animal videos. "
                "You answer with one valid JSON object and nothing else.")
STYLE = {
    "ar": " Use clear Modern Standard Arabic that every Arabic speaker understands, without diacritics.",
    "fr": " Address the viewer with 'vous'.",
    "es": " Use neutral Spanish understood in Spain and in Latin America, address the viewer as 'tú'.",
}


def _flatten(master):
    """Every text that must be localized, with a key to put it back."""
    items = [(k, master[k]) for k in ("title", "description", "tiktok_caption", "instagram_caption") if master.get(k)]
    items += [(("scene", i), sc["narration"]) for i, sc in enumerate(master["scenes"])]
    return items


def _chunks(items, size=5):
    meta = [it for it in items if not isinstance(it[0], tuple)]
    scenes = [it for it in items if isinstance(it[0], tuple)]
    out = [meta] if meta else []
    out += [scenes[i:i + size] for i in range(0, len(scenes), size)]
    return out


def _translate_chunk(chunk, src, lang, context, llm):
    texts = [t for _, t in chunk]
    n = len(texts)
    prompt = f"""Translate the {langs.name(src)} texts below into {langs.name(lang)}.
Write natural, fluent, spoken {langs.name(lang)}, the way a native presenter would say it in a pet-care video. Do NOT translate word for word.{STYLE.get(lang, "")}
Keep the meaning, numbers and facts. Keep website and brand names unchanged. Do not add or remove ideas.
Video title for context: {context}
Return ONLY this JSON: {{"items": ["...", "..."]}} with EXACTLY {n} strings, in the same order as the texts.
TEXTS:
{json.dumps(texts, ensure_ascii=False)}"""

    def check(d):
        items = d.get("items") if isinstance(d, dict) else d
        if not isinstance(items, list) or len(items) != n:
            raise ValueError(f'"items" must be a list of exactly {n} strings (you gave {len(items) if isinstance(items, list) else "no list"})')
        out = []
        for i, (key, src_text) in enumerate(chunk):
            t = _clean(items[i] if isinstance(items[i], str) else json.dumps(items[i], ensure_ascii=False))
            if not t:
                raise ValueError(f"item {i + 1} is empty")
            if key != "hashtags":
                if not langs.is_lang(t, lang):
                    raise ValueError(f"item {i + 1} is not written in {langs.name(lang)}: \"{t[:70]}\"")
                if len(src_text.split()) > 3 and t.lower() == src_text.lower():
                    raise ValueError(f"item {i + 1} was copied without translating")
                if len(t.split()) > 2.5 * len(src_text.split()) + 6:
                    raise ValueError(f"item {i + 1} is far too long")
            out.append(t)
        return out
    try:
        return llm.ask(prompt, LOCAL_SYSTEM, True, 2048, validate=check, temperature=0.3, tries=2)
    except LLMError:
        # Small local models often cannot keep a JSON list in order. Plain text, one sentence at a time, is far more robust.
        return [_translate_one(text, key, src, lang, context, llm) for key, text in chunk]


def _clean_translation(raw):
    """Small models add 'Okay, here is...', options and notes. Take the content of <t>..</t>, else the first real line."""
    m = re.search(r"<t>(.*?)</t>", raw, re.S | re.I) or re.search(r"<t>(.*)$", raw, re.S | re.I)
    if m:
        return _clean(m.group(1).strip(" \"'“”«»"))
    intro = re.compile(r"^(okay|ok|sure|certainly|here|voici|aqu[ií]|bien|claro|هذه|إليك|note|notes|explanation|option|translation|traduction|traducci[oó]n|الترجمة)\b", re.I)
    for line in raw.replace("**", "").replace("`", "").splitlines():
        line = line.strip(" *_-•\t")
        if not line:
            continue
        if intro.match(line):
            after = line.split(":", 1)[1].strip() if ":" in line else ""
            if after:
                return _clean(after.strip(" \"'“”«»"))
            continue
        return _clean(line.strip(" \"'“”«»"))
    return ""


def _translate_one(text, key, src, lang, context, llm):
    prompt = (f"Translate this {langs.name(src)} text into {langs.name(lang)}. Natural, fluent, spoken {langs.name(lang)}, "
              f"as a native presenter would say it in a pet-care video.{STYLE.get(lang, '')} Keep numbers, facts and website names. "
              f"Reply with ONLY the translation inside <t></t> tags, nothing else: no options, no notes, no explanation.\nVideo title for context: {context}\nTEXT: {text}")

    def check(t):
        t = _clean_translation(t)
        if not t:
            raise ValueError("empty answer")
        if not langs.is_lang(t, lang):
            raise ValueError(f"the answer is not written in {langs.name(lang)}")
        if len(text.split()) > 3 and t.lower() == text.lower():
            raise ValueError("copied without translating")
        if len(t.split()) > 2.5 * len(text.split()) + 8:
            raise ValueError("far too long: answer with the translation only")
        return t
    return llm.ask(prompt, LOCAL_SYSTEM, False, 600, validate=check, temperature=0.2, tries=3)


def _translate_tags(tags, src, lang, llm):
    """Hashtags are a bonus: translate them if possible, otherwise keep the originals (never fail a language for them)."""
    if not tags:
        return []
    n = len(tags)
    prompt = (f"Translate these {n} {langs.name(src)} hashtag words into {langs.name(lang)} (single words, no spaces, no #). "
              f'Return ONLY JSON: {{"items": [...]}} with EXACTLY {n} short strings.\nTEXTS:\n{json.dumps(tags, ensure_ascii=False)}')

    def check(d):
        items = d.get("items") if isinstance(d, dict) else None
        if not isinstance(items, list) or len(items) != n:
            raise ValueError(f"need exactly {n} items")
        out = [re.sub(r"[#\s]+", "", str(t)) for t in items]
        if any(not t or len(t) > 30 for t in out):
            raise ValueError("each hashtag must be one short word")
        return out
    try:
        return llm.ask(prompt, LOCAL_SYSTEM, True, 512, validate=check, temperature=0.3, tries=2)
    except Exception:
        return list(tags)


def localize(master, lang, llm, src="en"):
    """Translate/adapt the master script into `lang`. Every piece is checked to be REALLY in `lang`;
    raises LLMError if no provider can do it (we never render a video with the wrong language)."""
    done = {}
    for chunk in _chunks(_flatten(master)):
        for (key, _), text in zip(chunk, _translate_chunk(chunk, src, lang, master["title"], llm)):
            done[key if not isinstance(key, tuple) else key] = text
    out = {"title": done.get("title", master["title"])[:100], "description": done.get("description", ""),
           "tiktok_caption": done.get("tiktok_caption", ""), "instagram_caption": done.get("instagram_caption", ""),
           "hashtags": _translate_tags(master.get("hashtags", [])[:12], src, lang, llm),
           "scenes": [{"narration": done[("scene", i)], "visual": sc["visual"]} for i, sc in enumerate(master["scenes"])]}
    return out


def fallback_script(title, body, lang, site, tier):
    """No AI available: simple split of the article (source language only)."""
    sents = [s.strip() for s in re.split(r"(?<=[.!?؟])\s+|\n+", re.sub(r"[#*_>`]+", "", body)) if s.strip()]
    scenes, cur = [], ""
    for s in sents:
        if cur and len(cur) + len(s) > 150:
            scenes.append(cur); cur = s
        else:
            cur = (cur + " " + s).strip()
    if cur:
        scenes.append(cur)
    scenes = scenes[: tier["max_scenes"] - 1]
    scenes.append(langs.LANGS[lang]["cta"].format(site=site))
    return {"title": title[:100],
            "scenes": [{"narration": s, "visual": ("" if i == len(scenes) - 1 else
                        f"Photorealistic photo about pets, illustrating: {title}. {s[:120]}")} for i, s in enumerate(scenes)],
            "description": " ".join(scenes[:2])[:300], "hashtags": [], "tiktok_caption": "", "instagram_caption": ""}
