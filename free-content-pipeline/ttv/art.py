"""Art direction: understand the article, research how the real subjects look, then write REALISTIC image prompts.

1. analyze()   the AI reads the article: subjects (breeds, foods...), setting, mood, what stock photos usually get wrong
2. research()  facts about how those subjects really look: Wikipedia (free, official) + Google Search through Gemini (optional)
3. prompts()   one detailed photographic prompt per scene, with varied shots and anatomically correct subjects
"""
import hashlib, json, re, urllib.parse, urllib.request
from pathlib import Path
from .llm import LLMError

SYSTEM = ("You are an award-winning photo editor and art director for a pets and animals website. "
          "You answer with one valid JSON object and nothing else.")
UA = {"User-Agent": "ttv-pipeline/2.0 (article-to-video tool)"}


def _clean(s):
    return re.sub(r"\s+", " ", str(s)).strip()


# ------------------------------------------------------------------ 1) understand the article
def analyze(title, body, tier, llm):
    prompt = f"""Read this article and prepare the photo brief for its video.
Title: {title}
Article:
\"\"\"
{body[:tier['article_chars']]}
\"\"\"
Return JSON: {{"topic": "what the article is really about in one sentence",
"entities": [{{"name": "English name that can be looked up, e.g. Golden Retriever, Chocolate toxicity in dogs", "kind": "dog breed | cat breed | food | product | health topic | behaviour | place"}}],
"subjects": "ONE precise description of the main recurring subject so every image shows the same kind of animal, e.g. an adult golden retriever with a dense golden coat and dark eyes",
"setting": "the realistic places where this advice happens",
"mood": "the emotional tone of the photos",
"avoid": ["3 to 5 things that make animal photos look fake or wrong for THIS topic"]}}
Maximum 5 entities. Only include entities that really appear in the article."""

    def check(d):
        if not isinstance(d, dict) or not _clean(d.get("subjects", "")):
            raise ValueError('"subjects" is required')
        ents = [{"name": _clean(e.get("name", "")), "kind": _clean(e.get("kind", ""))} for e in d.get("entities", [])
                if isinstance(e, dict) and _clean(e.get("name", ""))][:5]
        return {"topic": _clean(d.get("topic", title)), "entities": ents, "subjects": _clean(d["subjects"]),
                "setting": _clean(d.get("setting", "")), "mood": _clean(d.get("mood", "")),
                "avoid": [_clean(x) for x in d.get("avoid", [])][:5]}
    return llm.ask(prompt, SYSTEM, True, 1200, validate=check, temperature=0.4, tries=2)


# ------------------------------------------------------------------ 2) research
def _get_json(url, timeout=20):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read())


def wikipedia(name, base="https://en.wikipedia.org"):
    q = urllib.parse.quote(name)
    hit = _get_json(f"{base}/w/api.php?action=query&list=search&srsearch={q}&format=json&srlimit=1&utf8=1")
    results = hit.get("query", {}).get("search", [])
    if not results:
        return None
    title = results[0]["title"]
    d = _get_json(f"{base}/api/rest_v1/page/summary/{urllib.parse.quote(title.replace(' ', '_'))}")
    text = _clean(d.get("extract", ""))
    if not text:
        return None
    return {"entity": name, "title": d.get("title", title), "text": text[:700],
            "url": d.get("content_urls", {}).get("desktop", {}).get("page", f"{base}/wiki/{title.replace(' ', '_')}")}


def research(analysis, cfg, llm, cache_dir):
    """Facts about how the subjects look. Cached per subject, so the same breed is never searched twice."""
    cache_dir = Path(cache_dir); cache_dir.mkdir(parents=True, exist_ok=True)
    rc = cfg.get("research") if isinstance(cfg.get("research"), dict) else {}
    notes, sources = [], []
    for ent in analysis["entities"]:
        key = cache_dir / (hashlib.md5(ent["name"].lower().encode()).hexdigest() + ".json")
        if key.exists():
            item = json.loads(key.read_text(encoding="utf-8"))
        else:
            item = {"wiki": None, "web": None, "web_urls": []}
            if rc.get("wikipedia", True):
                try:
                    item["wiki"] = wikipedia(ent["name"], rc.get("wikipedia_base", "https://en.wikipedia.org"))
                except Exception:
                    pass
            if rc.get("web", True) and llm.can_search_web():
                text, urls = llm.search_web(
                    f"For a photo editor: how does a real {ent['name']} ({ent['kind']}) look in a natural photograph? "
                    "Give 4 short factual bullet points: body shape, coat or surface, typical colours, typical real-life settings, "
                    "and common mistakes that make AI or stock images of it look fake. No introduction.")
                item["web"], item["web_urls"] = text, urls
            key.write_text(json.dumps(item, ensure_ascii=False), encoding="utf-8")
        if item.get("wiki"):
            notes.append(f"{ent['name']} (Wikipedia): {item['wiki']['text']}"); sources.append(item["wiki"]["url"])
        if item.get("web"):
            notes.append(f"{ent['name']} (web search): {_clean(item['web'])[:600]}"); sources += item.get("web_urls", [])
    return {"notes": notes, "sources": list(dict.fromkeys(sources))}


# ------------------------------------------------------------------ 3) one realistic prompt per scene
def prompts(master, analysis, found, llm, tier):
    scenes = master["scenes"]
    n = len(scenes)
    listing = "\n".join(f"{i + 1}. {sc['narration']}" for i, sc in enumerate(scenes))
    research_txt = "\n".join(found["notes"])[:2500] or "(no research available)"
    prompt = f"""Write the photo prompts for a video about: {analysis['topic']}
Main recurring subject (keep it identical in every image): {analysis['subjects']}
Realistic settings: {analysis['setting']}    Mood: {analysis['mood']}
Things that make these photos look fake, AVOID them: {'; '.join(analysis['avoid'])}
Research about how the real subjects look (use it for anatomical and visual accuracy only):
{research_txt}

Narration, scene by scene:
{listing}

For EACH of the {n} scenes write ONE detailed photograph description (40 to 70 words) of what the viewer should SEE while hearing that sentence:
- concrete subject doing a concrete action that matches the sentence, with correct anatomy and natural proportions
- vary the shot from scene to scene: wide, medium, close-up, macro detail, low angle, overhead, over-the-shoulder
- state the light (window light, golden hour, soft overcast...), the place and the lens/depth of field
- it must look like a real photograph from a magazine, NOT an illustration, NOT 3D, NO text, letters, logos or screens with writing
- the last scene is a call to action: show the main subject in a calm, appealing, welcoming moment (no text, no computer)
Return JSON: {{"scenes": [{{"shot": "close-up", "prompt": "..."}}]}} with EXACTLY {n} items."""

    def check(d):
        items = d.get("scenes") if isinstance(d, dict) else None
        if not isinstance(items, list) or len(items) != n:
            raise ValueError(f'"scenes" must be a list of exactly {n} items')
        out = []
        for i, it in enumerate(items):
            pr = _clean(it.get("prompt", "") if isinstance(it, dict) else it)
            if len(pr.split()) < 12:
                raise ValueError(f"prompt {i + 1} is too short, describe the photograph in detail")
            out.append({"shot": _clean(it.get("shot", "")) if isinstance(it, dict) else "", "prompt": pr})
        return out
    return llm.ask(prompt, SYSTEM, True, 3500, validate=check, temperature=0.6, tries=3)


def direct(title, body, master, tier, llm, cfg, cache_dir):
    """Full art direction. Returns {"analysis":..., "sources":[...], "scenes":[{shot,prompt}]} or None when no AI is available."""
    if not cfg.get("art_director", True) or not llm.available():
        return None
    try:
        analysis = analyze(title, body, tier, llm)
        found = research(analysis, cfg, llm, cache_dir)
        scenes = prompts(master, analysis, found, llm, tier)
        return {"analysis": analysis, "sources": found["sources"], "scenes": scenes}
    except Exception as e:                                         # art direction is optional: never stop the video because of it
        print(f"[!] art direction failed ({type(e).__name__}: {str(e)[:120]}); using the simple scene descriptions")
        return None


def final_prompt(scene_prompt, cfg):
    return f"{scene_prompt.rstrip('. ')}. {cfg['image_style']}. {cfg['image_negative']}."
