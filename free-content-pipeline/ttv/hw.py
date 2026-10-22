"""Detect the server's power and choose a work profile (lite / standard / strong / max)."""
import os, shutil, subprocess, sys

# ollama_models: best first. Gemma 3 is built for 140+ languages (good Arabic/French/Spanish); Qwen 2.5 is the fallback.
TIERS = {
    "lite":     dict(wide=(1280, 720), tall=(720, 1280), fps=24, preset="veryfast", crf=23, workers=1,
                     ollama_models=["gemma3:4b", "qwen2.5:3b", "gemma3:1b"], ollama_ctx=4096, max_scenes=7, article_chars=4000),
    "standard": dict(wide=(1920, 1080), tall=(1080, 1920), fps=30, preset="veryfast", crf=21, workers=1,
                     ollama_models=["gemma3:4b", "qwen2.5:7b", "qwen2.5:3b"], ollama_ctx=8192, max_scenes=8, article_chars=7000),
    "strong":   dict(wide=(1920, 1080), tall=(1080, 1920), fps=30, preset="faster", crf=20, workers=2,
                     ollama_models=["gemma3:12b", "qwen2.5:7b", "gemma3:4b"], ollama_ctx=12288, max_scenes=10, article_chars=12000),
    "max":      dict(wide=(1920, 1080), tall=(1080, 1920), fps=30, preset="medium", crf=19, workers=3,
                     ollama_models=["gemma3:27b", "gemma3:12b", "qwen2.5:14b"], ollama_ctx=16384, max_scenes=12, article_chars=20000),
}


def _ram_gb():
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal"):
                    return int(line.split()[1]) / 1048576
    except Exception:
        pass
    if sys.platform.startswith("win"):
        try:
            import ctypes

            class MS(ctypes.Structure):
                _fields_ = [("l", ctypes.c_ulong), ("m", ctypes.c_ulong), ("tp", ctypes.c_ulonglong),
                            ("ap", ctypes.c_ulonglong), ("tpf", ctypes.c_ulonglong), ("apf", ctypes.c_ulonglong),
                            ("tv", ctypes.c_ulonglong), ("av", ctypes.c_ulonglong), ("ae", ctypes.c_ulonglong)]
            s = MS(); s.l = ctypes.sizeof(MS)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(s))
            return s.tp / 1073741824
        except Exception:
            pass
    return 8.0


def _vram_gb():
    if not shutil.which("nvidia-smi"):
        return 0.0
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
                             capture_output=True, text=True, timeout=10).stdout.split()
        return max(float(x) for x in out) / 1024
    except Exception:
        return 0.0


def detect():
    return {"ram_gb": round(_ram_gb(), 1), "cores": os.cpu_count() or 1, "vram_gb": round(_vram_gb(), 1)}


def choose(h, name="auto"):
    if name in TIERS:
        tier = name
    elif h["vram_gb"] >= 12 or (h["ram_gb"] >= 24 and h["cores"] >= 6):
        tier = "max"
    elif h["ram_gb"] >= 12 and h["cores"] >= 4:
        tier = "strong"
    elif h["ram_gb"] >= 6 and h["cores"] >= 2:
        tier = "standard"
    else:
        tier = "lite"
    info = dict(TIERS[tier])
    if tier == "max" and h["vram_gb"] < 20:           # CPU-only (or small GPU): a 27B model is far too slow
        info["ollama_models"] = ["gemma3:12b", "qwen2.5:14b", "gemma3:4b"]
    if tier == "lite" and h["ram_gb"] < 5.5:          # gemma3:4b needs about 4 GB by itself
        info["ollama_models"] = ["qwen2.5:3b", "gemma3:1b"]
    return tier, info
