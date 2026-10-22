#!/usr/bin/env bash
# Upgrade an EXISTING server to this version without touching your data
# (config.json, .env, state.json, articles/, media/, output/, voices/ are kept).
# Usage:  unzip -o free-content-pipeline.zip -x "free-content-pipeline/config.json"   then   bash scripts/upgrade.sh
set -e
cd "$(dirname "$0")/.."
echo "== 1/4 Remove files of older versions (they now live in ttv/ and scripts/) =="
for f in hw.py langs.py llm.py scriptai.py images.py tts.py render.py wpsync.py server_setup.sh install_ai.sh install_cron.sh \
         install_windows.bat run.bat README_AR.md; do
  [ -f "$f" ] && rm -f "$f" && echo "removed $f"
done
echo "== 2/4 Python libraries =="
./venv/bin/pip install -q -r requirements.txt
./venv/bin/pip install -q edge-tts && echo "[ok] edge-tts" || echo "[i] edge-tts not installed (optional)"
echo "== 3/4 Keys file + settings migration =="
[ -f .env ] || cp .env.example .env
chmod 600 .env
for k in GEMINI_API_KEY AZURE_SPEECH_KEY AZURE_SPEECH_REGION CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN; do
  grep -q "^$k=" .env || echo "$k=" >> .env
done
./venv/bin/python - << 'PY'
import json
p = "config.json"
c = json.load(open(p, encoding="utf-8"))
changed = []
if c.get("tts_order") in (None, ["piper", "edge", "sapi", "espeak"]):
    c["tts_order"] = ["azure", "edge", "piper", "sapi", "espeak"]; changed.append("tts_order: neural voices first (Piper is robotic in Arabic)")
if "pollinations" in c.get("image_providers", []):
    c["image_providers"] = [x for x in c["image_providers"] if x != "pollinations"] or ["gemini", "cloudflare"]
    changed.append("image_providers: removed pollinations (it answers HTTP 402 now)")
if "cloudflare" not in c.get("image_providers", ["cloudflare"]):
    c["image_providers"].append("cloudflare"); changed.append("image_providers: added cloudflare")
json.dump(c, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("config.json updated:", "; ".join(changed) or "nothing to change")
PY
echo "== 4/4 Check =="
./venv/bin/python pipeline.py --doctor
echo
echo "Your posts and their state are kept: finished posts will be skipped. See:  ./venv/bin/python pipeline.py --status"
