"""Offline test servers (no internet, no keys, no models): a fake WordPress site + fake Gemini, Cloudflare, Azure TTS,
Wikipedia and Ollama, all on ONE port.  Usage:  python tests/mocks.py [port]      (default 8765)
Control endpoint:  POST /__control  {"action": "edit", "id": 11, "text": "..."}  |  {"action": "fail_lang", "langs": ["fr"]}
                   {"action": "add", "id": 14, "title": "..", "text": ".."}      |  {"action": "reset"}"""
import base64, io, json, math, random, re, struct, sys, threading, time, urllib.parse, wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, ImageDraw

KEYS = {"gemini": "goodkey", "azure": "azkey", "cf": "cftoken"}
BASE_POSTS = {
    11: ("How to Choose the Right Dog Food", "Dogs need balanced food with real protein. Check the first ingredient on the label. Puppies need more calories than adult dogs, and senior dogs need fewer. Measure every meal with a cup. Most adult dogs eat twice a day. Fresh water must always be available. Mix the new food with the old food over seven days."),
    12: ("Why Cats Purr", "Cats purr when they are happy, but also when they are stressed or hurt. Muscles in the larynx twitch very fast. The purr is between 25 and 150 hertz. Some experts believe purring helps cats heal faster."),
    13: ("How to Train a Puppy", "Start training early with short sessions. Reward good behaviour right away. Be patient and consistent every single day. Puppies learn quickly when the rules never change."),
}
POSTS, CTRL = {}, {"fail_langs": set(), "calls": 0}


def reset():
    POSTS.clear()
    for i, (t, x) in BASE_POSTS.items():
        POSTS[i] = {"title": t, "slug": re.sub(r"\W+", "-", t.lower()).strip("-"), "text": x, "modified": f"2026-10-0{i - 10}T10:00:00"}
    CTRL["fail_langs"] = set()


reset()
POOL = {
    "French": ["Choisir la bonne nourriture", "Voici un conseil simple pour votre chien et pour toute la famille.",
               "Les chiens ont besoin d'une alimentation équilibrée avec de vraies protéines, et il faut lire l'étiquette avec attention.",
               "Mesurez chaque repas avec une tasse, car la plupart des chiens adultes mangent deux fois par jour dans la maison.",
               "Changez de nourriture lentement, en mélangeant l'ancienne et la nouvelle pendant sept jours pour protéger la santé de votre compagnon."],
    "Spanish": ["Elegir la comida correcta", "Este es un consejo sencillo para tu perro y para toda la familia.",
                "Los perros necesitan una alimentación equilibrada con proteínas reales, y es importante leer la etiqueta con atención.",
                "Mide cada comida con una taza, porque la mayoría de los perros adultos comen dos veces al día en casa.",
                "Cambia de comida poco a poco, mezclando la antigua y la nueva durante siete días para cuidar la salud de tu compañero."],
    "Arabic": ["اختيار الطعام المناسب", "هذه نصيحة بسيطة لكلبك ولكل أفراد العائلة في البيت.",
               "تحتاج الكلاب إلى غذاء متوازن يحتوي على بروتين حقيقي، ومن المهم قراءة الملصق على العبوة بعناية كبيرة.",
               "قس كل وجبة بكوب، لأن معظم الكلاب البالغة تأكل مرتين في اليوم وتحتاج دائماً إلى ماء نظيف.",
               "غيّر الطعام ببطء، واخلط القديم مع الجديد لمدة سبعة أيام حتى تحافظ على صحة رفيقك الوفي."]}
SCENES = ["Is your dog eating the wrong food right now?", "Choose food with real protein as the first ingredient on the label.",
          "Puppies need more calories than adults, and senior dogs need fewer.", "Measure every meal with a cup and keep fresh water ready all day.",
          "Change food slowly over seven days and watch your dog's energy.", "Read the full guide on our website for every detail."]


def pick(lang, text):
    n, pool = len(text.split()), POOL[lang]
    return pool[0] if n <= 6 else pool[1] if n <= 11 else pool[2] if n <= 16 else pool[3] if n <= 20 else pool[4]


def png(w=1024, h=1024, seed=0):
    r = random.Random(seed); im = Image.new("RGB", (w, h), (r.randint(40, 200), r.randint(40, 200), r.randint(40, 200)))
    d = ImageDraw.Draw(im)
    for _ in range(40):
        x, y, s = r.randint(0, w), r.randint(0, h), r.randint(40, 300)
        d.ellipse((x, y, x + s, y + s), fill=(r.randint(0, 255), r.randint(0, 255), r.randint(0, 255)))
    b = io.BytesIO(); im.save(b, "JPEG"); return b.getvalue()


def wav_speech(text, rate=24000):
    """Speech-like WAV: amplitude-modulated tone, about 0.33 s per word."""
    secs = max(1.0, len(text.split()) * 0.33)
    n = int(secs * rate); b = io.BytesIO(); w = wave.open(b, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
    w.writeframes(b"".join(struct.pack("<h", int(9000 * math.sin(2 * math.pi * 170 * i / rate) * (0.6 + 0.4 * math.sin(2 * math.pi * 4 * i / rate)))) for i in range(n)))
    w.close(); return b.getvalue()


def answer(prompt):
    """What a competent AI model would answer, decided from the prompt (shared by Gemini, Ollama, Groq mocks)."""
    CTRL["calls"] += 1
    m = re.search(r"Translate the \w+ texts below into (French|Spanish|Arabic)", prompt)
    if m:
        lang = m.group(1)
        items = json.JSONDecoder().raw_decode(prompt.split("TEXTS:")[1].strip())[0]
        code = {"French": "fr", "Spanish": "es", "Arabic": "ar"}[lang]
        return json.dumps({"items": items if code in CTRL["fail_langs"] else [pick(lang, t) for t in items]}, ensure_ascii=False)
    m = re.search(r"Translate this \w+ text into (French|Spanish|Arabic)", prompt)
    if m:
        code = {"French": "fr", "Spanish": "es", "Arabic": "ar"}[m.group(1)]
        text = prompt.split("TEXT:")[1].strip()
        return text if code in CTRL["fail_langs"] else "Voici la traduction : " + pick(m.group(1), text) if False else pick(m.group(1), text)
    m = re.search(r"into (French|Spanish|Arabic) \(single words", prompt)
    if m:
        tags, _ = json.JSONDecoder().raw_decode(prompt.split("TEXTS:")[1].strip())
        return json.dumps({"items": (["chiens", "soins", "nourriture", "chiot"] * 4)[:len(tags)]}, ensure_ascii=False)
    if "prepare the photo brief" in prompt:
        return json.dumps({"topic": "choosing healthy food for a dog", "entities": [{"name": "Golden Retriever", "kind": "dog breed"}, {"name": "Dog food", "kind": "food"}],
                           "subjects": "an adult golden retriever with a dense golden coat and dark eyes", "setting": "a bright home kitchen and a green park",
                           "mood": "warm, caring", "avoid": ["plastic looking fur", "extra legs", "unreadable fake labels"]})
    if "Write the photo prompts for a video" in prompt:
        n = int(re.search(r"EXACTLY (\d+) items", prompt).group(1))
        shots = ["wide", "close-up", "macro", "low angle", "overhead", "medium"]
        return json.dumps({"scenes": [{"shot": shots[i % 6], "prompt": f"A {shots[i % 6]} photograph of an adult golden retriever with a dense golden coat in a bright home kitchen, "
                                       f"soft window light, 85mm lens, shallow depth of field, calm natural mood, scene {i + 1}"} for i in range(n)]})
    if "Write the video script." in prompt:
        title = re.search(r"Article title: (.*)", prompt).group(1)
        return json.dumps({"title": title[:70], "description": "A simple guide. Read the full article on our website.",
                           "hashtags": ["dogs", "petcare", "dogfood", "puppy", "healthydog", "dogtips", "nutrition", "pets"],
                           "tiktok_caption": "Are you doing this wrong?", "instagram_caption": "Save this for later",
                           "scenes": [{"narration": t, "visual": "a dog and a bowl"} for t in SCENES]})
    return "{}"


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send(self, code, body, ct="application/json"):
        b = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code); self.send_header("Content-Type", ct); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path == "/wp-json/wp/v2/posts":
            if int(q.get("page", ["1"])[0]) > 1:
                return self.send(400, b"")
            out = []
            for i, p in sorted(POSTS.items(), reverse=True):
                out.append({"id": i, "slug": p["slug"], "link": f"http://127.0.0.1:8765/{i}/", "modified_gmt": p["modified"],
                            "date_gmt": p["modified"], "title": {"rendered": p["title"]},
                            "content": {"rendered": "".join(f"<p>{s}</p>" for s in p["text"].split(". ")) + f"<img src='/img/{i}.jpg'>"},
                            "_embedded": {}})
            return self.send(200, out)
        if u.path.startswith("/img/"):
            return self.send(200, png(1600, 900, int(re.findall(r"\d+", u.path)[0])), "image/jpeg")
        if u.path == "/w/api.php":
            return self.send(200, {"query": {"search": [{"title": "Golden Retriever"}]}})
        if u.path.startswith("/api/rest_v1/page/summary/"):
            return self.send(200, {"title": "Golden Retriever", "extract": "The Golden Retriever is a medium-large dog with a dense, water-repellent golden coat, feathered legs and a friendly face.",
                                   "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Golden_Retriever"}}})
        if u.path == "/api/tags":
            return self.send(200, {"models": [{"name": "gemma3:4b"}]})
        self.send(404, b"")

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); raw = self.rfile.read(n); p = self.path
        body = json.loads(raw) if raw[:1] == b"{" else {}
        if p == "/__control":
            if body["action"] == "edit":
                POSTS[body["id"]].update(text=body["text"], modified=time.strftime("%Y-%m-%dT%H:%M:%S"), **({"title": body["title"]} if "title" in body else {}))
            elif body["action"] == "add":
                POSTS[body["id"]] = {"title": body["title"], "slug": re.sub(r"\W+", "-", body["title"].lower()).strip("-"), "text": body["text"], "modified": "2026-10-09T10:00:00"}
            elif body["action"] == "touch":
                POSTS[body["id"]]["modified"] = time.strftime("%Y-%m-%dT%H:%M:%S")
            elif body["action"] == "fail_lang":
                CTRL["fail_langs"] = set(body["langs"])
            elif body["action"] == "reset":
                reset()
            return self.send(200, {"ok": True})
        if ":generateContent" in p:
            if self.headers.get("x-goog-api-key") != KEYS["gemini"]:
                return self.send(403, {"error": "bad key"})
            if "image" in p:
                return self.send(200, {"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(png(1024, 1024, CTRL["calls"])).decode()}}]}}]})
            if "tts" in p:
                return self.send(200, {"candidates": [{"content": {"parts": [{"inlineData": {"data": base64.b64encode(wav_speech(body["contents"][0]["parts"][0]["text"])[44:]).decode()}}]}}]})
            text = body["contents"][0]["parts"][0]["text"]
            if body.get("tools"):
                return self.send(200, {"candidates": [{"content": {"parts": [{"text": "- Medium-large dog, dense water-repellent golden coat\n- Feathered legs and tail\n- Common mistake: plastic-looking fur"}]},
                                                       "groundingMetadata": {"groundingChunks": [{"web": {"uri": "https://example.org/golden"}}]}}]})
            return self.send(200, {"candidates": [{"content": {"parts": [{"text": answer(text)}]}}]})
        if "/ai/run/" in p:
            if self.headers.get("Authorization") != "Bearer " + KEYS["cf"]:
                return self.send(403, {"success": False, "errors": ["bad token"]})
            return self.send(200, {"success": True, "result": {"image": base64.b64encode(png(1024, 1024, CTRL["calls"] + 7)).decode()}})
        if p == "/cognitiveservices/v1":
            if self.headers.get("Ocp-Apim-Subscription-Key") != KEYS["azure"]:
                return self.send(401, b"")
            text = re.sub(r"<[^>]+>", "", raw.decode("utf-8"))
            return self.send(200, wav_speech(text), "audio/wav")
        if p == "/api/chat":
            return self.send(200, {"message": {"content": answer(body["messages"][-1]["content"])}})
        if p == "/api/generate":
            return self.send(200, {"response": ""})
        self.send(404, b"")


def serve(port=8765):
    s = ThreadingHTTPServer(("127.0.0.1", port), H)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    serve(port); print(f"mock servers on :{port}"); sys.stdout.flush()
    while True:
        time.sleep(3600)
