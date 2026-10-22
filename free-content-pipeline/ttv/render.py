"""Video engine: fonts for every language, animated captions, Ken Burns images, ffmpeg assembly."""
import glob, json, math, re, shutil, subprocess, unicodedata
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, features
from . import langs

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
except Exception:
    arabic_reshaper = None
try:
    USE_RAQM = features.check("raqm")
except Exception:
    USE_RAQM = False

PALETTES = [((20, 30, 70), (90, 40, 140)), ((10, 70, 90), (20, 140, 120)), ((90, 30, 40), (200, 100, 60)),
            ((30, 30, 30), (80, 90, 110)), ((20, 60, 30), (110, 160, 60))]
WINDOWS = ["segoeuib.ttf", "tahomabd.ttf", "arialbd.ttf", "segoeui.ttf", "arial.ttf"]
LINUX = ["dejavu/DejaVuSans-Bold.ttf", "noto/NotoSans-Bold.ttf", "noto/NotoSansArabic-Bold.ttf",
         "liberation/LiberationSans-Bold.ttf", "freefont/FreeSansBold.ttf"]


def run(cmd):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{cmd[0]} failed: {r.stderr[-1200:]}")
    return r


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).stdout.strip())


# ------------------------------------------------------------------ fonts (a font must contain the glyphs!)
@lru_cache(maxsize=None)
def _font_paths(user_font):
    paths = [user_font] if user_font else []
    paths += [f"C:/Windows/Fonts/{n}" for n in WINDOWS] + [f"/usr/share/fonts/truetype/{n}" for n in LINUX]
    paths += sorted(glob.glob("/usr/share/fonts/**/*Bold*.ttf", recursive=True))
    paths += sorted(glob.glob("/usr/share/fonts/**/*.ttf", recursive=True))[:200]
    seen, out = set(), []
    for p in paths:
        if p not in seen and Path(p).exists():
            seen.add(p); out.append(p)
    return tuple(out)


@lru_cache(maxsize=None)
def _load(path, size):
    return ImageFont.truetype(path, size)


def _glyph(f, ch):
    im = Image.new("L", (70, 70), 0)
    ImageDraw.Draw(im).text((8, 4), ch, font=f, fill=255)
    return im.tobytes()


@lru_cache(maxsize=None)
def _covers(path, chars):
    f = _load(path, 40)
    ref = _glyph(f, "\u0378")                               # unassigned code point = the font's "missing" box
    return all(_glyph(f, c) != ref for c in chars)


def find_font(cfg, size, text=""):
    chars = "".join(sorted({c for c in text if unicodedata.category(c) not in ("Cf", "Cc", "Zs")}))[:80]
    first = None
    for p in _font_paths(cfg.get("font", "") or ""):
        try:
            f = _load(p, size)
        except Exception:
            continue
        first = first or f
        if _covers(p, chars):
            return f
    return first or ImageFont.load_default()


# ------------------------------------------------------------------ text (right-to-left aware)
def tkw(text):
    return {"direction": "rtl", "language": "ar"} if USE_RAQM and langs.HAS_AR.search(text) else {}


def prep(text):
    if not USE_RAQM and arabic_reshaper and langs.HAS_AR.search(text):
        return get_display(arabic_reshaper.reshape(text))
    return text


def tlen(font, text):
    return font.getlength(prep(text), **tkw(text))


def tdraw(d, xy, text, font, fill, **kw):
    d.text(xy, prep(text), font=font, fill=fill, **tkw(text), **kw)


def wrap(text, font, max_w):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if tlen(font, t) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    return lines + ([cur] if cur else [])


# ------------------------------------------------------------------ images
def background(W, H, idx, src=None):
    if src:
        img = Image.open(src).convert("RGB")
        r = max(W / img.width, H / img.height)
        img = img.resize((math.ceil(img.width * r), math.ceil(img.height * r)), Image.LANCZOS)
        l, t = (img.width - W) // 2, (img.height - H) // 2
        return ImageEnhance.Brightness(img.crop((l, t, l + W, t + H))).enhance(0.86)
    c1, c2 = PALETTES[idx % len(PALETTES)]
    mask = Image.linear_gradient("L").resize((W, H))
    return Image.composite(Image.new("RGB", (W, H), c2), Image.new("RGB", (W, H), c1), mask)


def _fit_line(font_cfg, text, size, max_w):
    f = find_font(font_cfg, size, text)
    while tlen(f, text) > max_w and size > 14:
        size -= 2
        f = find_font(font_cfg, size, text)
    return f


def make_overlay(text, title, brand, W, H, layout, cfg, hook=False):
    """Transparent PNG layer: caption box + title + brand. The text never moves or gets cropped."""
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    if layout == "tall":
        size, max_w, max_h = int(W * (0.098 if hook else 0.082)), int(W * 0.86), H * 0.30
    else:
        size, max_w, max_h = int(H * (0.072 if hook else 0.06)), int(W * 0.80), H * 0.30
    while True:
        font = find_font(cfg, size, text)
        lines = wrap(text, font, max_w - 40)
        lh = int(size * 1.36)
        if len(lines) * lh <= max_h or size < 20:
            break
        size -= 4
    th, pad = len(lines) * lh, int(size * 0.42)
    widest = int(max(tlen(font, l) for l in lines)) if lines else 0
    y0 = int(H * 0.62) - th // 2 if layout == "tall" else int(H * 0.90) - th - pad
    d.rounded_rectangle(((W - widest) // 2 - pad, y0 - pad, (W + widest) // 2 + pad, y0 + th + pad),
                        int(size * 0.5), fill=(0, 0, 0, 150))
    for i, ln in enumerate(lines):
        tdraw(d, ((W - tlen(font, ln)) / 2, y0 + i * lh), ln, font, (255, 226, 110) if hook else "white")
    small = int(min(W, H) * 0.036)
    if title:
        tf = _fit_line(cfg, title, small, int(W * 0.9))
        ty = int(H * (0.11 if layout == "tall" else 0.035))
        d.rectangle((0, max(0, ty - 12), W, ty + small + 20), fill=(0, 0, 0, 110))
        tdraw(d, ((W - tlen(tf, title)) / 2, ty), title, tf, (255, 255, 255, 235))
    if brand:
        bf = find_font(cfg, int(small * 0.9), brand)
        tdraw(d, ((W - tlen(bf, brand)) / 2, int(H * (0.80 if layout == "tall" else 0.94))), brand, bf, (255, 255, 255, 200))
    return ov


def split_chunks(text, n):
    chunks, cur = [], []
    for w in text.split():
        cur.append(w)
        if len(cur) >= n or (re.search(r"[.!?؟,;:،]$", w) and len(cur) >= max(2, n // 2)):
            chunks.append(" ".join(cur)); cur = []
    return chunks + ([" ".join(cur)] if cur else [])


def chunk_times(chunks, total):
    """Spread `total` seconds over the chunks by text length and punctuation (used when the voice gives no timings)."""
    w = [len(c) + (8 if re.search(r"[.!?؟]$", c) else 4 if re.search(r"[,;:،]$", c) else 0) for c in chunks]
    return [total * x / sum(w) for x in w]


def timed_chunks(chunks, wav, lead, speech, dur):
    """Seconds shown for each caption chunk. Exact when the voice engine wrote word timings (edge), else estimated.
    The last chunk always stays until the end of the scene."""
    words_f = Path(str(wav) + ".words.json")
    ev = []
    if words_f.exists():
        try:
            ev = json.loads(words_f.read_text(encoding="utf-8"))
        except Exception:
            ev = []
    n_words = sum(len(c.split()) for c in chunks)
    if ev and n_words and 0.7 <= len(ev) / n_words <= 1.4:
        starts, seen = [0.0], 0
        for c in chunks[:-1]:
            seen += len(c.split())
            starts.append(lead + ev[min(len(ev) - 1, round(seen * len(ev) / n_words))][0])
        secs = [b - a for a, b in zip(starts, starts[1:] + [dur])]
        if all(x > 0.05 for x in secs):
            return secs
    secs = chunk_times(chunks, lead + speech)
    secs[-1] += dur - (lead + speech)
    return secs


# ------------------------------------------------------------------ ffmpeg
def render_scene(bg_png, overlays, frames, W, H, fps, out, idx, enc, transition=0.0):
    """Silent clip with EXACT `frames` frames: the image slowly moves, the caption layers change on time.
    The sound is built separately as ONE continuous track (see build_audio), so there are no gaps or clicks."""
    dur = frames / fps
    mode = idx % 3
    if mode == 0:
        zp = "z='min(zoom+0.0007,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    elif mode == 1:
        zp = "z='if(eq(on,0),1.15,max(zoom-0.0007,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    else:
        zp = f"z=1.12:x='(iw-iw/zoom)*on/{frames}':y='ih/2-(ih/zoom/2)'"
    lst = Path(out).with_suffix(".ffconcat")
    rows = ["ffconcat version 1.0"]
    for p, sec in overlays:
        rows += [f"file '{Path(p).resolve().as_posix()}'", f"duration {sec:.4f}"]
    rows.append(f"file '{Path(overlays[-1][0]).resolve().as_posix()}'")
    lst.write_text("\n".join(rows) + "\n", encoding="utf-8")
    fade = ""
    if transition > 0:
        fd = min(transition, dur / 5)
        fade = f",fade=t=in:st=0:d={fd:.2f},fade=t=out:st={dur-fd:.2f}:d={fd:.2f}"
    fc = (f"[0:v]scale={2*W}:{2*H},zoompan={zp}:d={frames}:s={W}x{H}:fps={fps}[bg];"
          f"[1:v]fps={fps},format=rgba[ov];[bg][ov]overlay=0:0:format=auto{fade},format=yuv420p[v]")
    run(["ffmpeg", "-y", "-i", bg_png, "-f", "concat", "-safe", "0", "-i", lst, "-filter_complex", fc, "-map", "[v]",
         "-frames:v", str(frames), "-an", "-c:v", "libx264", "-preset", enc["preset"], "-crf", str(enc["crf"]), out])


def concat(files, out):
    lst = Path(out).with_suffix(".txt")
    lst.write_text("".join(f"file '{Path(f).resolve().as_posix()}'\n" for f in files), encoding="utf-8")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out])
    lst.unlink()


def scene_audio(wav, text, fps, cfg, out):
    """One narration -> a stereo PCM file whose length is an exact number of video frames: a short lead-in, tiny
    fades (no clicks) and a natural pause after the sentence. Returns (frames, seconds, speech_seconds, lead)."""
    speech, lead = duration(wav), 0.06
    gap = cfg["gap_sentence"] if re.search(r"[.!?؟…]\s*$", text.strip()) else cfg["gap_clause"]
    frames = math.ceil((lead + speech + gap) * fps)
    dur = frames / fps
    af = (f"afade=t=in:d=0.015,afade=t=out:st={max(0.0, speech - 0.04):.3f}:d=0.04,"
          f"adelay=delays={int(lead * 1000)}:all=1,apad=whole_dur={dur:.4f}")
    run(["ffmpeg", "-y", "-i", wav, "-af", af, "-t", f"{dur:.4f}", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", out])
    return frames, dur, speech, lead


def build_audio(pads, idx, out, work, cfg, music=None):
    """Join the chosen scene sounds into ONE track (lossless), mix the music under it, equalise the loudness,
    and encode to AAC ONCE. (Encoding every scene separately and cutting them together made audible gaps.)"""
    lst = Path(work) / (Path(out).stem + "_audio.txt")
    lst.write_text("".join(f"file '{Path(pads[i]).resolve().as_posix()}'\n" for i in idx), encoding="utf-8")
    joined = Path(work) / (Path(out).stem + "_joined.wav")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    ln = f"loudnorm=I={cfg['loudness']}:TP=-1.5:LRA=11"
    if music:
        run(["ffmpeg", "-y", "-i", joined, "-stream_loop", "-1", "-i", music, "-filter_complex",
             f"[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0:weights=1 0.14,{ln}[a]", "-map", "[a]",
             "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out])
    else:
        run(["ffmpeg", "-y", "-i", joined, "-af", ln, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out])


def assemble(clips, pads, idx, out, work, cfg, music):
    """video = the chosen silent clips cut together (lossless), sound = one continuous track, then join them."""
    work = Path(work)
    v, a = work / (Path(out).stem + "_v.mp4"), work / (Path(out).stem + "_a.m4a")
    concat([clips[i] for i in idx], v)
    build_audio(pads, idx, a, work, cfg, music)
    run(["ffmpeg", "-y", "-i", v, "-i", a, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest",
         "-movflags", "+faststart", out])


def make_thumbnail(src, title, cfg, out, W=1280, H=720):
    img = background(W, H, 0, src).convert("RGBA")
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(H // 3, H):
        gd.line((0, y, W, y), fill=(0, 0, 0, int(190 * (y - H // 3) / (H - H // 3))))
    img = Image.alpha_composite(img, grad)
    d = ImageDraw.Draw(img)
    size = int(H * 0.115)
    while True:
        f = find_font(cfg, size, title)
        lines = wrap(title, f, int(W * 0.88))
        if len(lines) <= 3 or size < 30:
            break
        size -= 6
    lh = int(size * 1.25)
    y = H - 50 - len(lines) * lh
    for i, ln in enumerate(lines):
        tdraw(d, ((W - tlen(f, ln)) / 2, y + i * lh), ln, f, (255, 232, 120), stroke_width=max(2, size // 14), stroke_fill="black")
    img.convert("RGB").save(out, quality=92)


def _srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"


# ------------------------------------------------------------------ one language, all formats
def render_language(out_dir, lang, script, bgs, cfg, tier, formats, brand, speak, keep_work=False):
    out_dir = Path(out_dir); work = out_dir / "work"; work.mkdir(parents=True, exist_ok=True)
    scenes, title, fps = script["scenes"], script["title"], tier["fps"]
    pads, frames, durs, info = [], [], [], []
    for i, sc in enumerate(scenes):
        raw, pad = work / f"s{i:02d}.wav", work / f"s{i:02d}_pad.wav"
        eng = speak(sc["narration"], lang, raw, cfg)
        f, d, speech, lead = scene_audio(raw, sc["narration"], fps, cfg, pad)
        pads.append(pad); frames.append(f); durs.append(d); info.append((raw, lead, speech))
        print(f"  [{lang}] voice {i+1}/{len(scenes)}  ({eng}, {speech:.1f}s speech, {d:.1f}s scene)")

    jobs, clips = [], {f: [] for f in formats}
    for fmt in formats:
        W, H = tier[fmt]
        layout, nwords = ("wide", 6) if fmt == "wide" else ("tall", 3)
        for i, sc in enumerate(scenes):
            bg = work / f"s{i:02d}_{fmt}_bg.png"
            background(W, H, i, bgs[i]).convert("RGB").save(bg)
            chunks = split_chunks(sc["narration"], nwords)
            raw, lead, speech = info[i]
            secs = timed_chunks(chunks, raw, lead, speech, durs[i])
            ovs = []
            for k, ch in enumerate(chunks):
                p = work / f"s{i:02d}_{fmt}_c{k:02d}.png"
                make_overlay(ch, title, brand, W, H, layout, cfg, hook=(i == 0)).save(p)
                ovs.append((p, secs[k]))
            mp4 = work / f"s{i:02d}_{fmt}.mp4"
            clips[fmt].append(mp4)
            jobs.append((bg, ovs, frames[i], W, H, fps, mp4, i, tier, cfg.get("transition", 0.0)))
    with ThreadPoolExecutor(max_workers=max(1, tier["workers"])) as ex:
        for n, _ in enumerate(ex.map(lambda j: render_scene(*j), jobs), 1):
            if n % len(scenes) == 0:
                print(f"  [{lang}] rendered {n}/{len(jobs)} clips")

    files = {}
    mus = next(iter(sorted(Path(cfg["_root"], "music").glob("*.mp3"))), None) if cfg.get("music", True) else None
    n, last = len(scenes), len(scenes) - 1
    if "wide" in clips:
        files["video"] = out_dir / "video_16x9.mp4"
        assemble(clips["wide"], pads, list(range(n)), files["video"], work, cfg, mus)
    if "tall" in clips:
        idx, total = [], 0.0
        for i in range(last):                       # hook first, call-to-action always last
            if idx and total + durs[i] + durs[last] > cfg["short_max_seconds"]:
                break
            idx.append(i); total += durs[i]
        idx.append(last)
        files["short"] = out_dir / "short_9x16.mp4"
        assemble(clips["tall"], pads, idx, files["short"], work, cfg, mus)
        if cfg.get("minis", True) and sum(durs) > cfg["short_max_seconds"] * 1.3:
            (out_dir / "minis").mkdir(exist_ok=True)
            group, gt, k = [], 0.0, 0
            for i in range(n):
                group.append(i); gt += durs[i]
                if gt >= cfg.get("mini_seconds", 35) or i == n - 1:
                    k += 1
                    files[f"mini{k}"] = out_dir / "minis" / f"mini_{k:02d}_9x16.mp4"
                    assemble(clips["tall"], pads, group, files[f"mini{k}"], work, cfg, mus)
                    group, gt = [], 0.0
    # subtitles for YouTube (SRT), same timing as the on-screen captions
    srt, t0 = [], 0.0
    for i, sc in enumerate(scenes):
        chunks = split_chunks(sc["narration"], 6)
        raw, lead, speech = info[i]
        for ch, sec in zip(chunks, timed_chunks(chunks, raw, lead, speech, durs[i])):
            srt.append((t0, t0 + sec, ch)); t0 += sec
    (out_dir / "subtitles.srt").write_text(
        "".join(f"{k}\n{_srt_time(a)} --> {_srt_time(b)}\n{t}\n\n" for k, (a, b, t) in enumerate(srt, 1)), encoding="utf-8")
    make_thumbnail(bgs[0], title, cfg, out_dir / "thumbnail.jpg")
    if not keep_work:
        shutil.rmtree(work, ignore_errors=True)
    return files
