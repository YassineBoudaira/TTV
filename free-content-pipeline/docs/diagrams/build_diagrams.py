#!/usr/bin/env python3
"""Builds every diagram (SVG + PNG) in English and Arabic from ONE description.   Needs Graphviz:  apt install graphviz
Run:  python3 docs/diagrams/build_diagrams.py        Output: docs/diagrams/en/*.svg|png  and  docs/diagrams/ar/*.svg|png"""
import subprocess, sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
C = dict(core="#DCEBFF", data="#E3F5E1", ext="#FFE8CC", user="#EBDDFB", opt="#EEEEEE", warn="#FFD9D9", ok="#CFF2D5")


def head(lang, rank="LR", extra=""):
    rd = {"LR": "RL" if lang == "ar" else "LR", "TB": "TB"}[rank]
    return (f'digraph G {{ rankdir={rd}; bgcolor="white"; pad=0.3; nodesep=0.35; ranksep=0.5; compound=true; {extra}\n'
            'node [shape=box, style="rounded,filled", fontname="DejaVu Sans", fontsize=12, margin="0.14,0.08", color="#667"];\n'
            'edge [fontname="DejaVu Sans", fontsize=10, color="#556"];\n'
            'graph [fontname="DejaVu Sans", fontsize=13, style="rounded", color="#99A"];\n')


def N(i, text, kind="core", shape="box"):
    return f'{i} [label="{text}", fillcolor="{C[kind]}", shape={shape}];\n'


def d01(L):   # ------------------------------------------------------------------ system architecture
    s = head(L.lang, "LR", "newrank=true;")
    s += f'subgraph cluster_site {{ label="{L("Your website", "موقعك")}"; style="rounded,filled"; fillcolor="#FAFAFF";\n'
    s += N("wp", L("WordPress<br/>nestpetanimals.com", "ووردبريس<br/>nestpetanimals.com"), "user") + "}\n"
    s += f'subgraph cluster_srv {{ label="{L("Server (VPS) or your PC", "الخادم (VPS) أو حاسوبك")}"; style="rounded,filled"; fillcolor="#F7FAFF";\n'
    s += N("cli", L("cli.py<br/>commands, plan, edits", "cli.py<br/>الأوامر والخطة والتعديلات")) + N("sync", L("wpsync.py<br/>read posts, hash, images", "wpsync.py<br/>قراءة المقالات والصور")) \
        + N("st", L("state.py<br/>new / edited / partial / done", "state.py<br/>جديد / معدّل / ناقص / منجز"), "core") \
        + N("hw", L("hw.py<br/>detect RAM, CPU, GPU", "hw.py<br/>قياس قوة الجهاز")) \
        + N("sc", L("scriptai.py<br/>script, hook, localize", "scriptai.py<br/>السيناريو والخطاف والتوطين")) \
        + N("art", L("art.py<br/>art director + research", "art.py<br/>مخرج فني + بحث")) \
        + N("img", L("images.py<br/>image providers + quality gate", "images.py<br/>مزودو الصور وفحص الجودة")) \
        + N("tts", L("tts.py<br/>voice engines", "tts.py<br/>محركات الصوت")) \
        + N("ren", L("render.py<br/>captions, motion, FFmpeg, audio", "render.py<br/>الترجمة والحركة وFFmpeg والصوت")) \
        + N("llm", L("llm.py<br/>text AI chain", "llm.py<br/>سلسلة نماذج النص")) \
        + N("data", L("articles/ media/ output/<br/>state.json  config.json  .env", "articles/ media/ output/<br/>state.json  config.json  .env"), "data", "folder") + "}\n"
    s += f'subgraph cluster_ext {{ label="{L("AI and cloud services (free tiers)", "خدمات الذكاء الاصطناعي والسحابة (طبقات مجانية)")}"; style="rounded,filled"; fillcolor="#FFFBF2";\n'
    s += N("gem", L("Google Gemini<br/>text, web search, Nano Banana", "Google Gemini<br/>نص وبحث ويب وصور Nano Banana"), "ext") \
        + N("grq", L("Groq / OpenAI-compatible", "Groq / متوافق مع OpenAI"), "ext") + N("cla", L("Claude (paid, optional)", "Claude (مدفوع، اختياري)"), "opt") \
        + N("cf", L("Cloudflare FLUX.1<br/>images", "Cloudflare FLUX.1<br/>صور"), "ext") + N("az", L("Azure Speech<br/>neural voices", "Azure Speech<br/>أصوات عصبية"), "ext") \
        + N("edg", L("Edge neural voices<br/>(unofficial)", "أصوات Edge العصبية<br/>(غير رسمية)"), "ext") + N("wiki", L("Wikipedia", "ويكيبيديا"), "ext") \
        + N("oll", L("Ollama (local AI)", "Ollama (ذكاء محلي)"), "opt") + N("pip", L("Piper (local voice)", "Piper (صوت محلي)"), "opt") + "}\n"
    s += N("me", L("You: download videos (scp)<br/>and publish", "أنت: تحمّل الفيديوهات (scp)<br/>وتنشرها"), "user")
    s += N("pub", L("YouTube / TikTok / Instagram", "YouTube / TikTok / Instagram"), "user")
    for a, b, lab in (("wp", "sync", "REST / RSS"), ("cli", "sync", ""), ("cli", "st", ""), ("cli", "hw", ""), ("sync", "data", ""), ("st", "data", ""),
                      ("cli", "sc", ""), ("sc", "llm", ""), ("art", "llm", ""), ("cli", "art", ""), ("cli", "img", ""), ("cli", "tts", ""), ("cli", "ren", ""),
                      ("llm", "gem", ""), ("llm", "grq", ""), ("llm", "cla", ""), ("llm", "oll", ""), ("art", "wiki", ""), ("img", "gem", ""), ("img", "cf", ""),
                      ("tts", "az", ""), ("tts", "edg", ""), ("tts", "pip", ""), ("ren", "data", L("videos", "الفيديوهات")), ("data", "me", ""), ("me", "pub", "")):
        s += f'{a} -> {b}' + (f' [label="{lab}"]' if lab else "") + ";\n"
    return s + "}"


def d02(L):   # ------------------------------------------------------------------ flow for one post
    s = head(L.lang, "TB")
    steps = [("a", "Read all posts of the site (REST, else RSS)", "قراءة كل مقالات الموقع (REST ثم RSS)", "ext"),
             ("b", "Plan: classify each post<br/>new / edited / partial / complete", "الخطة: تصنيف كل مقال<br/>جديد / معدّل / ناقص / منجز", "core"),
             ("c", "Take the next posts of the queue (limit)<br/>finished posts are skipped", "أخذ المقالات التالية من الطابور (limit)<br/>المنجزة تُتخطى", "core"),
             ("d", "Edited? show the diff, archive the old videos", "معدّل؟ عرض الفروق وأرشفة الفيديوهات القديمة", "warn"),
             ("e", "Save article.md + download the post images", "حفظ المقال وتحميل صوره", "data"),
             ("f", "Master script (hook, scenes, description)<br/>by the text AI - cached by content hash", "السيناريو الرئيسي (خطاف ومشاهد ووصف)<br/>بالذكاء الاصطناعي - مخزّن حسب بصمة المحتوى", "core"),
             ("g", "Art direction: analyze article, research (Wikipedia + web),<br/>one realistic photo prompt per scene", "التوجيه الفني: تحليل المقال والبحث (ويكيبيديا + الويب)<br/>ووصف صورة واقعية لكل مشهد", "core"),
             ("h", "Localize the script for each language<br/>(checked: right language, same scene count)", "توطين السيناريو لكل لغة<br/>(مع فحص اللغة وعدد المشاهد)", "core"),
             ("i", "Images once for all languages<br/>AI image or article photo (quality gate)", "الصور مرة واحدة لكل اللغات<br/>صورة مولّدة أو من المقال (فحص الجودة)", "ext"),
             ("j", "For each language: voice, silent clips, ONE audio track,<br/>captions, assemble", "لكل لغة: الصوت والمقاطع الصامتة ومسار صوت واحد<br/>والترجمة ثم التجميع", "core"),
             ("k", "Outputs: video, short, minis, thumbnail, SRT, publish.txt", "المخرجات: فيديو وShort ومقاطع وصورة مصغرة وSRT وpublish.txt", "ok"),
             ("l", "Save state after EACH language<br/>(failed language: attempts +1)", "حفظ الحالة بعد كل لغة<br/>(اللغة الفاشلة: محاولات +1)", "data")]
    for i, en, ar, k in steps:
        s += N(i, L(en, ar), k)
    s += "a->b->c->d->e->f->g->h->i->j->k->l;\n"
    s += f'l -> c [style=dashed, constraint=false, label="{L("next run / next post", "التشغيل التالي / المقال التالي")}"];\n'
    return s + "}"


def d03(L):   # ------------------------------------------------------------------ post states
    s = head(L.lang, "LR")
    for i, en, ar, k in (("new", "NEW<br/>never seen", "جديد<br/>لم يُرَ من قبل", "core"), ("edited", "EDITED<br/>text hash changed", "معدّل<br/>تغيّرت بصمة النص", "warn"),
                         ("part", "PARTIAL<br/>a language is missing<br/>attempts left", "ناقص<br/>لغة مفقودة<br/>ومحاولات متبقية", "ext"),
                         ("gave", "GAVE UP<br/>3 failed attempts", "تم التوقف<br/>3 محاولات فاشلة", "opt"), ("meta", "META<br/>only the date changed", "تغيّر التاريخ فقط<br/>النص نفسه", "opt"),
                         ("done", "COMPLETE<br/>all languages done<br/>(skipped)", "منجز<br/>كل اللغات جاهزة<br/>(يُتخطى)", "ok"), ("q", "QUEUE order:<br/>1. new  2. edited  3. partial", "ترتيب الطابور:<br/>1. جديد  2. معدّل  3. ناقص", "data")):
        s += N(i, L(en, ar), k, "box" if i != "q" else "note")
    for a, b, lab in (("new", "done", L("all languages ok", "كل اللغات نجحت")), ("new", "part", L("a language failed", "فشلت لغة")),
                      ("part", "done", L("retry ok", "نجحت المحاولة")), ("part", "gave", L("failed 3 times", "فشلت 3 مرات")),
                      ("gave", "part", L("--retry-failed", "--retry-failed")), ("done", "edited", L("text edited", "عُدّل النص")),
                      ("done", "meta", L("date only", "التاريخ فقط")), ("meta", "done", L("nothing to redo", "لا شيء لإعادته")),
                      ("edited", "new", L("old videos archived,<br/>revision + 1", "أرشفة القديم<br/>ورقم نسخة +1")), ("gave", "edited", L("an edit resets attempts", "التعديل يصفّر المحاولات"))):
        s += f'{a} -> {b} [label="{lab}"];\n'
    s += "q -> new [style=invis];\n"
    return s + "}"


def d04(L):   # ------------------------------------------------------------------ audio / video build
    s = head(L.lang, "TB")
    s += N("wav", L("narration of one scene<br/>(voice engine)", "تعليق مشهد واحد<br/>(محرك الصوت)"), "ext")
    s += N("pad", L("scene_audio<br/>lead 0.06s, 15-40 ms fades,<br/>pause 0.45s (sentence) / 0.28s (comma)<br/>length = exact number of frames", "scene_audio<br/>مقدمة 0.06ث وتلاشٍ قصير<br/>وقفة 0.45ث (جملة) / 0.28ث (فاصلة)<br/>الطول = عدد صحيح من الإطارات"), "core")
    s += N("img", L("scene image", "صورة المشهد"), "ext") + N("bg", L("background crop<br/>9:16 and 16:9", "قص الخلفية<br/>9:16 و 16:9"), "core")
    s += N("cap", L("caption layers<br/>3 words (vertical) / 6 words (wide)<br/>timed by word timings or text length", "طبقات الترجمة<br/>3 كلمات (عمودي) / 6 (أفقي)<br/>بتوقيت الكلمات أو طول النص"), "core")
    s += N("clip", L("silent clip<br/>slow zoom / pan, EXACT frames", "مقطع صامت<br/>تكبير/تمرير بطيء بعدد إطارات مضبوط"), "core")
    s += N("vcat", L("cut clips together<br/>(lossless copy)", "ربط المقاطع<br/>(نسخ بلا فقد)"), "core")
    s += N("acat", L("join sounds into ONE track<br/>(lossless PCM)", "دمج الأصوات في مسار واحد<br/>(PCM بلا فقد)"), "core")
    s += N("mus", L("music (optional)<br/>mixed low", "موسيقى (اختياري)<br/>بصوت منخفض"), "opt")
    s += N("norm", L("loudness -16 LUFS<br/>AAC encoded ONCE", "ضبط الشدة -16 LUFS<br/>ترميز AAC مرة واحدة"), "core")
    s += N("mux", L("join video + audio<br/>-> mp4", "ضم الفيديو والصوت<br/>-> mp4"), "ok")
    s += N("out", L("video_16x9.mp4<br/>short_9x16.mp4 (hook first, call to action last)<br/>minis/mini_XX.mp4<br/>subtitles.srt  thumbnail.jpg", "video_16x9.mp4<br/>short_9x16.mp4 (الخطاف أولاً ونداء القراءة أخيراً)<br/>minis/mini_XX.mp4<br/>subtitles.srt  thumbnail.jpg"), "ok")
    s += N("old", L("OLD way (the choppy sound):<br/>AAC per scene + cut by -shortest<br/>-> 0.06 s between sentences", "الطريقة القديمة (سبب التقطّع):<br/>AAC لكل مشهد وقص بـ -shortest<br/>-> 0.06 ثانية فقط بين الجمل"), "warn")
    for a, b in (("wav", "pad"), ("img", "bg"), ("bg", "clip"), ("cap", "clip"), ("clip", "vcat"), ("pad", "acat"), ("mus", "acat"), ("acat", "norm"), ("vcat", "mux"), ("norm", "mux"), ("mux", "out")):
        s += f"{a} -> {b};\n"
    s += "pad -> cap [style=dashed, label=\"timing\"];\nold -> wav [style=invis];\n"
    return s + "}"


def d05(L):   # ------------------------------------------------------------------ provider chains
    s = head(L.lang, "LR")
    chains = [("t", L("TEXT AI (script, translation, art direction)", "الذكاء النصي (السيناريو والترجمة والتوجيه الفني)"),
               [("Gemini", L("free key", "مفتاح مجاني"), "ext"), ("Groq", L("free key", "مفتاح مجاني"), "ext"), ("Claude", L("paid", "مدفوع"), "opt"),
                ("Ollama", L("local, free", "محلي مجاني"), "opt"), (L("simple script", "سيناريو بسيط"), L("source language only", "لغة المقال فقط"), "warn")]),
              ("i", L("IMAGES", "الصور"), [("Gemini Nano Banana", L("free key, limited", "مفتاح مجاني محدود"), "ext"), ("Cloudflare FLUX.1", L("free 10k neurons/day", "مجاني 10 آلاف/يوم"), "ext"),
                                           (L("article photos", "صور المقال"), L("real photos", "صور حقيقية"), "data"), (L("plain background", "خلفية سادة"), "", "warn")]),
              ("v", L("VOICE", "الصوت"), [("Azure Speech", L("official, free 500k chars", "رسمي مجاني 500 ألف حرف"), "ext"), ("Edge neural", L("free, unofficial", "مجاني غير رسمي"), "ext"),
                                          ("Piper", L("offline, robotic Arabic", "دون إنترنت، عربي آلي"), "opt"), ("Windows / espeak", "", "opt"), (L("silent", "صامت"), "", "warn")])]
    for key, title, items in chains:
        s += f'subgraph cluster_{key} {{ label="{title}"; style="rounded,filled"; fillcolor="#FAFAFA";\n'
        for n, (nm, note, kind) in enumerate(items):
            s += N(f"{key}{n}", nm + (f"<br/><font point-size='10'>{note}</font>" if note else ""), kind)
        s += " -> ".join(f"{key}{n}" for n in range(len(items))) + f' [label="{L("if it fails", "عند الفشل")}"];\n}}\n'
    s = s.replace('label="', 'label=<', 1) if False else s
    return s.replace("<br/>", "\\n").replace("<font point-size='10'>", "").replace("</font>", "") + "}"


def d06(L):   # ------------------------------------------------------------------ deployment
    s = head(L.lang, "TB")
    s += f'subgraph cluster_pc {{ label="{L("Your PC (Windows)", "حاسوبك (Windows)")}"; style="rounded,filled"; fillcolor="#FAF6FF";\n'
    s += N("ps", L("PowerShell<br/>ssh / scp", "PowerShell<br/>ssh / scp"), "user") + N("key", L("SSH key<br/>.ssh/id_ed25519", "مفتاح SSH<br/>.ssh/id_ed25519"), "user") + N("dl", L("videos folder<br/>(you review and publish)", "مجلد الفيديوهات<br/>(تراجعها وتنشرها)"), "user") + "}\n"
    s += f'subgraph cluster_vps {{ label="{L("VPS server (Ubuntu 24.04)", "خادم VPS (Ubuntu 24.04)")}"; style="rounded,filled"; fillcolor="#F4FAFF";\n'
    s += N("setup", L("scripts/server_setup.sh<br/>FFmpeg, fonts, voices, firewall,<br/>fail2ban, key-only SSH", "scripts/server_setup.sh<br/>FFmpeg والخطوط والأصوات والجدار الناري<br/>وfail2ban ودخول بالمفتاح فقط"), "core")
    s += N("env", L(".env (keys, chmod 600)<br/>config.json", ".env (المفاتيح، صلاحيات 600)<br/>config.json"), "data")
    s += N("cron", L("cron 03:00 + flock<br/>pipeline.py --site", "cron الساعة 03:00 مع flock<br/>pipeline.py --site"), "core")
    s += N("run", L("pipeline: new / edited / partial posts only", "الخط: المقالات الجديدة والمعدّلة والناقصة فقط"), "core")
    s += N("out", L("output/  state.json  run.log", "output/  state.json  run.log"), "data", "folder") + "}\n"
    s += N("wp", L("nestpetanimals.com<br/>(WordPress)", "nestpetanimals.com<br/>(ووردبريس)"), "ext") + N("api", L("Gemini / Cloudflare /<br/>Azure / Groq", "Gemini / Cloudflare /<br/>Azure / Groq"), "ext")
    s += N("big", L("LATER: stronger server (e.g. Oracle Cloud)<br/>same steps - hw.py raises the profile alone", "لاحقاً: خادم أقوى (مثل Oracle Cloud)<br/>الخطوات نفسها - hw.py يرفع الملف تلقائياً"), "opt")
    for a, b, lab in (("ps", "setup", L("1 scp zip + ssh", "1 رفع zip + ssh")), ("key", "ps", ""), ("setup", "env", L("2 add keys", "2 إضافة المفاتيح")), ("env", "run", ""), ("cron", "run", ""),
                      ("wp", "run", "REST"), ("run", "api", ""), ("run", "out", ""), ("out", "dl", L("3 scp -r output", "3 scp -r output")), ("out", "big", L("move state.json + .env", "نقل state.json و .env"))):
        s += f'{a} -> {b}' + (f' [label="{lab}"]' if lab else "") + ";\n"
    return s + "}"


def d07(L):   # ------------------------------------------------------------------ folders
    s = head(L.lang, "LR", 'node [shape=box];')
    items = [("root", "free-content-pipeline/", "core"),
             ("pl", L("pipeline.py  (launcher)", "pipeline.py  (نقطة التشغيل)"), "core"), ("ttv", "ttv/   " + L("(the program)", "(البرنامج)"), "core"),
             ("sc", "scripts/   " + L("(install, upgrade, cron)", "(التثبيت والتحديث والجدولة)"), "opt"), ("ts", "tests/   " + L("(unit tests + mock services)", "(اختبارات وخدمات تجريبية)"), "opt"),
             ("dc", "docs/   " + L("(guides + diagrams)", "(الأدلة والمخططات)"), "opt"), ("cf", "config.json   .env   requirements.txt", "data"),
             ("ar", "articles/   " + L("posts as .md + .json", "المقالات .md و .json"), "data"), ("me", "media/<slug>/   " + L("photos of each post", "صور كل مقال"), "data"),
             ("mu", "music/   " + L("optional mp3", "mp3 اختياري"), "data"), ("vo", "voices/   " + L("Piper voices", "أصوات Piper"), "data"), ("stt", "state.json   " + L("what is done", "ما تم إنجازه"), "data"),
             ("out", "output/", "ok"), ("o1", "output/<slug>/", "ok"), ("o2", "master_en.json   assets/ (prompts.json)   article.md   CHANGELOG.md", "ok"),
             ("o3", "en/ fr/ ar/ es/  " + L("video_16x9.mp4  short_9x16.mp4  minis/  thumbnail.jpg  subtitles.srt  publish.txt", "video_16x9.mp4  short_9x16.mp4  minis/  thumbnail.jpg  subtitles.srt  publish.txt"), "ok"),
             ("o4", "_archive/<slug>/rev1_DATE/   " + L("old versions of edited posts", "النسخ القديمة للمقالات المعدّلة"), "warn"), ("o5", "_reports/   " + L("run reports + edits.md", "تقارير التشغيل + edits.md"), "warn"),
             ("o6", "_cache/research/   " + L("research cache", "ذاكرة البحث المؤقتة"), "opt")]
    for i, t, k in items:
        s += N(i, t, k)
    for a, b in (("root", "pl"), ("root", "ttv"), ("root", "sc"), ("root", "ts"), ("root", "dc"), ("root", "cf"), ("root", "ar"), ("root", "me"), ("root", "mu"), ("root", "vo"), ("root", "stt"), ("root", "out"),
                 ("out", "o1"), ("o1", "o2"), ("o1", "o3"), ("out", "o4"), ("out", "o5"), ("out", "o6")):
        s += f"{a} -> {b};\n"
    return s + "}"


def d08(L):   # ------------------------------------------------------------------ modules dependency
    s = head(L.lang, "LR")
    mods = [("cli", "cli.py", "core"), ("pf", "postflow.py", "core"), ("cfg", "config.py", "data"), ("stt", "state.py", "data"), ("rep", "report.py", "data"), ("doc", "doctor.py", "opt"),
            ("ws", "wpsync.py", "ext"), ("hw", "hw.py", "core"), ("llm", "llm.py", "ext"), ("sc", "scriptai.py", "core"), ("art", "art.py", "core"), ("im", "images.py", "ext"),
            ("tt", "tts.py", "ext"), ("rd", "render.py", "core"), ("lg", "langs.py", "data"), ("mg", "manage.py", "opt")]
    for i, t, k in mods:
        s += N(i, t, k)
    for a, b in (("cli", "mg"), ("mg", "stt"), ("cli", "cfg"), ("cli", "stt"), ("cli", "rep"), ("cli", "doc"), ("cli", "ws"), ("cli", "hw"), ("cli", "llm"), ("cli", "pf"), ("pf", "sc"), ("pf", "art"), ("pf", "im"), ("pf", "tt"), ("pf", "rd"),
                 ("pf", "stt"), ("sc", "llm"), ("art", "llm"), ("sc", "lg"), ("rd", "lg"), ("tt", "lg"), ("ws", "stt"), ("doc", "tt"), ("doc", "im"), ("doc", "rd")):
        s += f"{a} -> {b};\n"
    return s + "}"


DIAGRAMS = [("01-architecture", d01), ("02-post-flow", d02), ("03-post-states", d03), ("04-audio-video-build", d04),
            ("05-provider-fallbacks", d05), ("06-deployment", d06), ("07-folders", d07), ("08-modules", d08)]


class Lab:
    def __init__(self, lang): self.lang = lang
    def __call__(self, en, ar): return ar if self.lang == "ar" else en


def build():
    for lang in ("en", "ar"):
        (OUT / lang).mkdir(exist_ok=True)
        for name, fn in DIAGRAMS:
            src = fn(Lab(lang)).replace("<br/>", "\\n")
            dot = OUT / lang / f"{name}.dot"
            dot.write_text(src, encoding="utf-8")
            for fmt, extra in (("svg", []), ("png", ["-Gdpi=130"])):
                r = subprocess.run(["dot", f"-T{fmt}", *extra, str(dot), "-o", str(OUT / lang / f"{name}.{fmt}")], capture_output=True, text=True)
                if r.returncode:
                    sys.exit(f"graphviz failed on {lang}/{name}: {r.stderr[:300]}")
    print("diagrams built:", len(DIAGRAMS) * 2, "(svg + png each)")


if __name__ == "__main__":
    build()
