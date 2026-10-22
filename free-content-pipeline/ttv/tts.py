"""Voice-over engines, tried in the order of `tts_order`:
  azure   Azure AI Speech neural voices. OFFICIAL, free tier 500,000 characters/month (needs AZURE_SPEECH_KEY + AZURE_SPEECH_REGION)
  edge    Microsoft Edge neural voices through the `edge-tts` package. Free, unofficial, needs internet. Gives exact word timings.
  gemini  Gemini text-to-speech (needs GEMINI_API_KEY, small free quota)
  piper   local offline voices (robotic Arabic: the Arabic model expects diacritics)
  sapi    Windows built-in voices          espeak  very robotic, last resort           silent  so the video is still made
A engine that fails twice in a run is skipped. Engines that know word timings write <audio>.words.json (used for the captions)."""
import asyncio, base64, json, os, shutil, subprocess, sys, urllib.error, urllib.request
from pathlib import Path
from xml.sax.saxutils import escape
from . import langs

_fail = {}
AZURE_LOCALE = {"en": "en-US", "fr": "fr-FR", "es": "es-ES", "ar": "ar-SA"}


def _run(cmd, **kw):
    subprocess.run([str(c) for c in cmd], check=True, capture_output=True, text=True, **kw)


def _voice(lang, cfg, key):
    return cfg.get("tts_voices", {}).get(lang) or langs.LANGS[lang][key]


def _to_wav(src, out):
    _run(["ffmpeg", "-y", "-i", src, "-ar", "24000", "-ac", "1", out])


# ------------------------------------------------------------------ engines
def _azure(text, lang, out, cfg):
    key, region = os.environ.get("AZURE_SPEECH_KEY", ""), os.environ.get("AZURE_SPEECH_REGION", "")
    if not (key and region):
        raise RuntimeError("no AZURE_SPEECH_KEY / AZURE_SPEECH_REGION")
    base = cfg.get("azure_base") or f"https://{region}.tts.speech.microsoft.com"
    ssml = (f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{AZURE_LOCALE[lang]}'>"
            f"<voice name='{_voice(lang, cfg, 'azure')}'><prosody rate='-2%'>{escape(text)}</prosody></voice></speak>")
    req = urllib.request.Request(base + "/cognitiveservices/v1", ssml.encode("utf-8"),
                                 {"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
                                  "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "ttv-pipeline"})
    with urllib.request.urlopen(req, timeout=60) as r:
        Path(out).write_bytes(r.read())


def _edge(text, lang, out, cfg):
    import edge_tts
    voice, mp3, words = _voice(lang, cfg, "edge"), Path(out).with_suffix(".mp3"), []

    async def go():
        comm = edge_tts.Communicate(text, voice, boundary="WordBoundary")
        with open(mp3, "wb") as f:
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    words.append([ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch.get("text", "")])
    try:
        asyncio.run(asyncio.wait_for(go(), 90))
    except TypeError:                                              # old edge-tts without the boundary argument
        words.clear()

        async def plain():
            await edge_tts.Communicate(text, voice).save(str(mp3))
        asyncio.run(asyncio.wait_for(plain(), 90))
    _to_wav(mp3, out)
    if words:
        Path(str(out) + ".words.json").write_text(json.dumps(words), encoding="utf-8")


def _gemini(text, lang, out, cfg):
    key = os.environ.get("GEMINI_API_KEY") or cfg.get("gemini_api_key", "")
    if not key:
        raise RuntimeError("no GEMINI_API_KEY")
    base = cfg.get("gemini_base", "https://generativelanguage.googleapis.com")
    model = cfg.get("gemini_tts_model", "gemini-2.5-flash-preview-tts")
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": cfg.get("gemini_voice", "Kore")}}}}}
    req = urllib.request.Request(f"{base}/v1beta/models/{model}:generateContent", json.dumps(body).encode(),
                                 {"Content-Type": "application/json", "x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read())
    pcm = base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
    raw = Path(out).with_suffix(".pcm"); raw.write_bytes(pcm)
    _run(["ffmpeg", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", raw, out])


def _piper(text, lang, out, cfg):
    exe, model = cfg.get("piper_exe", ""), cfg.get("piper_models", {}).get(lang, "")
    if not (exe and model and Path(model).exists()):
        raise RuntimeError("no piper voice for " + lang)
    subprocess.run([exe, "--model", model, "--output_file", str(out)], input=text, text=True, check=True, capture_output=True)


def _sapi(text, lang, out, cfg):
    if not sys.platform.startswith("win"):
        raise RuntimeError("not windows")
    txt = Path(out).with_suffix(".txt"); txt.write_text(text, encoding="utf-8")
    voice = cfg.get("sapi_voices", {}).get(lang, "").replace("'", "")
    sel = f"$s.SelectVoice('{voice}');" if voice else ""
    ps = ("Add-Type -AssemblyName System.Speech;$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
          f"{sel}$s.SetOutputToWaveFile('{out}');$s.Speak([IO.File]::ReadAllText('{txt}',[Text.Encoding]::UTF8));$s.Dispose()")
    _run(["powershell", "-NoProfile", "-Command", ps])


def _espeak(text, lang, out, cfg):
    if not shutil.which("espeak-ng"):
        raise RuntimeError("no espeak-ng")
    _run(["espeak-ng", "-v", langs.LANGS[lang]["espeak"], "-w", out, text])


def _silent(text, lang, out, cfg):
    _run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{max(2.5, len(text.split()) / 2.6):.2f}", out])


ENGINES = {"azure": _azure, "edge": _edge, "gemini": _gemini, "piper": _piper, "sapi": _sapi, "espeak": _espeak, "silent": _silent}


def order_for(lang, cfg):
    o = cfg.get("tts_order_by_lang", {}).get(lang) or cfg.get("tts_order", ["azure", "edge", "piper", "sapi", "espeak"])
    return [e for e in o if e in ENGINES] + ["silent"]


def speak(text, lang, out, cfg):
    """Write the narration to `out` (wav). Returns the engine that worked."""
    errors = []
    for eng in order_for(lang, cfg):
        if _fail.get(eng, 0) >= 2:
            continue
        try:
            Path(str(out) + ".words.json").unlink(missing_ok=True)
            ENGINES[eng](text, lang, str(out), cfg)
            if Path(out).exists() and Path(out).stat().st_size > 1000:
                _fail[eng] = 0
                return eng
            raise RuntimeError("empty audio")
        except Exception as e:
            errors.append(f"{eng}: {type(e).__name__}")
            if not (isinstance(e, RuntimeError) and str(e).startswith(("no ", "not "))):     # a missing key is not a failure
                _fail[eng] = _fail.get(eng, 0) + 1
            if isinstance(e, urllib.error.HTTPError) and e.code in (401, 403):
                _fail[eng] = 9
    raise RuntimeError("no voice engine worked (" + "; ".join(errors) + ")")


def engine_for(lang, cfg):
    """Which engine would speak this language - no audio is produced (used by --doctor)."""
    for eng in order_for(lang, cfg):
        if eng == "azure" and os.environ.get("AZURE_SPEECH_KEY") and os.environ.get("AZURE_SPEECH_REGION"):
            return "azure neural"
        if eng == "edge":
            try:
                import edge_tts  # noqa
                return "edge neural (online)"
            except Exception:
                pass
        if eng == "gemini" and (os.environ.get("GEMINI_API_KEY") or cfg.get("gemini_api_key")):
            return "gemini tts"
        if eng == "piper" and cfg.get("piper_exe") and Path(cfg.get("piper_models", {}).get(lang, "x")).exists():
            return "piper (offline)"
        if eng == "sapi" and sys.platform.startswith("win"):
            return "windows voice"
        if eng == "espeak" and shutil.which("espeak-ng"):
            return "espeak-ng (robotic)"
    return "silent (no voice!)"
