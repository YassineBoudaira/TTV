"""Scene images: Nano Banana (Gemini image models) -> Cloudflare FLUX.1 schnell (free 10,000 neurons/day).
Every image passes a quality gate (size, not blank). A provider that is refused (HTTP 401/402/403) is skipped for the run."""
import base64, io, json, os, time, urllib.error, urllib.request
from PIL import Image, ImageStat

_fails, _dead = {}, set()


def _save_valid(data, out):
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if im.width < 512 or im.height < 512:
        raise ValueError("image too small")
    if max(ImageStat.Stat(im.resize((64, 64)).convert("L")).stddev) < 12:
        raise ValueError("image is blank or flat")
    im.save(out, quality=93)


def _post(url, body, headers, timeout=180):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get("Content-Type", "")


def _gemini(prompt, cfg, out):
    key = os.environ.get("GEMINI_API_KEY") or cfg.get("gemini_api_key", "")
    base = cfg.get("gemini_base", "https://generativelanguage.googleapis.com")
    model = cfg.get("gemini_image_model", "gemini-2.5-flash-image")
    for attempt in (1, 2):
        try:
            raw, _ = _post(f"{base}/v1beta/models/{model}:generateContent", {"contents": [{"parts": [{"text": prompt}]}]},
                           {"x-goog-api-key": key})
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 1:
                time.sleep(25); continue
            raise
    for c in json.loads(raw).get("candidates", []):
        for p in c.get("content", {}).get("parts", []):
            inl = p.get("inlineData") or p.get("inline_data")
            if inl and inl.get("data"):
                _save_valid(base64.b64decode(inl["data"]), out); return
    raise RuntimeError("no image in the answer")


def _cloudflare(prompt, cfg, out):
    acc, tok = os.environ.get("CLOUDFLARE_ACCOUNT_ID", ""), os.environ.get("CLOUDFLARE_API_TOKEN", "")
    base = cfg.get("cloudflare_base", "https://api.cloudflare.com")
    model = cfg.get("cloudflare_model", "@cf/black-forest-labs/flux-1-schnell")
    body = {"prompt": prompt[:2000], "steps": int(cfg.get("cloudflare_steps", 6)), "seed": int(time.time()) % 1000000}
    raw, ctype = _post(f"{base}/client/v4/accounts/{acc}/ai/run/{model}", body, {"Authorization": "Bearer " + tok})
    if "json" in ctype:
        d = json.loads(raw)
        b64 = (d.get("result") or {}).get("image")
        if not b64:
            raise RuntimeError("no image in the answer: " + str(d.get("errors", ""))[:120])
        raw = base64.b64decode(b64)
    _save_valid(raw, out)


def _pollinations(prompt, cfg, out):
    import urllib.parse
    clean_p = urllib.parse.quote(prompt[:350].strip())
    url = f"https://image.pollinations.ai/prompt/{clean_p}?width=1280&height=720&nologo=true"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=25) as r:
        raw = r.read()
    _save_valid(raw, out)


PROVIDERS = {"pollinations": _pollinations, "cloudflare": _cloudflare, "gemini": _gemini}


def _has_key(name, cfg):
    if name == "pollinations":
        return True
    if name == "gemini":
        return bool(os.environ.get("GEMINI_API_KEY") or cfg.get("gemini_api_key"))
    if name == "cloudflare":
        return bool(os.environ.get("CLOUDFLARE_ACCOUNT_ID") and os.environ.get("CLOUDFLARE_API_TOKEN"))
    return False


def available(cfg):
    return [n for n in cfg.get("image_providers", ["pollinations", "cloudflare", "gemini"]) if n in PROVIDERS and _has_key(n, cfg) and n not in _dead]


def generate(prompt, cfg, out):
    """Try each provider; True when an image was written to `out`."""
    for n in available(cfg):
        try:
            PROVIDERS[n](prompt, cfg, out)
            _fails[n] = 0
            return True
        except urllib.error.HTTPError as e:
            if e.code in (401, 402, 403):
                _dead.add(n); print(f"    [!] image provider {n} refused the request (HTTP {e.code}): check the key / plan. Skipped for this run.")
            else:
                _fails[n] = _fails.get(n, 0) + 1; print(f"    [!] image provider {n} failed (HTTP {e.code})")
        except Exception as e:
            _fails[n] = _fails.get(n, 0) + 1; print(f"    [!] image provider {n} failed ({type(e).__name__}: {str(e)[:80]})")
        if _fails.get(n, 0) >= 3:
            _dead.add(n); print(f"    [!] image provider {n} failed 3 times: skipped for this run")
    return False
