#!/usr/bin/env bash
# One-shot setup for Ubuntu 24.04 VPS. Run as root from the project folder:  bash scripts/server_setup.sh
set -e
export DEBIAN_FRONTEND=noninteractive
cd "$(dirname "$0")/.."
HERE="$(pwd)"

echo "== 1/7 System update =="
apt-get update -y
apt-get upgrade -y

echo "== 2/7 Packages (FFmpeg, Python, Arabic fonts, security) =="
apt-get install -y ffmpeg python3 python3-venv python3-pip unzip wget espeak-ng \
  fonts-noto-core fonts-dejavu-core libraqm0 fail2ban ufw tmux

echo "== 3/7 Firewall + brute-force protection =="
ufw allow OpenSSH
ufw --force enable
systemctl enable --now fail2ban

echo "== 4/7 Python environment =="
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

echo "== 5/7 Voices: Arabic, English, French (Piper, optional - falls back to espeak-ng) =="
mkdir -p voices
set_piper() {   # $1 = exe path (or empty), $2 = lang, $3 = model path (or empty)
  ./venv/bin/python - "$1" "$2" "$3" << 'PY'
import json, sys
p = "config.json"
c = json.load(open(p, encoding="utf-8"))
if sys.argv[1]:
    c["piper_exe"] = sys.argv[1]
c.setdefault("piper_models", {})[sys.argv[2]] = sys.argv[3]
json.dump(c, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY
}
if ./venv/bin/pip install piper-tts; then
  HF=https://huggingface.co/rhasspy/piper-voices/resolve/main
  # lang | path on server | file name
  for v in "ar|ar/ar_JO/kareem/medium|ar_JO-kareem-medium" \
           "en|en/en_US/lessac/medium|en_US-lessac-medium" \
           "fr|fr/fr_FR/siwis/medium|fr_FR-siwis-medium" \
           "es|es/es_ES/davefx/medium|es_ES-davefx-medium"; do
    IFS='|' read -r L P F <<< "$v"
    if wget -q -O "voices/$L.onnx" "$HF/$P/$F.onnx" && wget -q -O "voices/$L.onnx.json" "$HF/$P/$F.onnx.json"; then
      set_piper "$HERE/venv/bin/piper" "$L" "$HERE/voices/$L.onnx"
      if echo "test" | "$HERE/venv/bin/piper" --model "voices/$L.onnx" --output_file /tmp/piper_test.wav >/dev/null 2>&1 && [ -s /tmp/piper_test.wav ]; then
        echo "[ok] Piper voice works: $L"
      else
        echo "[!] Piper voice failed for $L -> espeak-ng will be used"; set_piper "" "$L" ""
      fi
    else
      echo "[!] Could not download the $L voice -> espeak-ng will be used"; set_piper "" "$L" ""
    fi
  done
else
  echo "[!] Piper could not be installed -> espeak-ng will be used for all languages"
fi

./venv/bin/pip install edge-tts >/dev/null 2>&1 && echo "[ok] edge-tts installed (optional online voices)" || echo "[i] edge-tts not installed (optional)"
[ -f .env ] || cp .env.example .env
chmod 600 .env

echo "== 6/7 Disable password login (only if an SSH key is installed) =="
if [ -s /root/.ssh/authorized_keys ]; then
  echo "PasswordAuthentication no" > /etc/ssh/sshd_config.d/00-nopass.conf
  systemctl reload ssh || true
  echo "[ok] password login disabled, key login only"
else
  echo "[i] no SSH key found, leaving password login as is"
fi

echo
echo "== 7/7 Free local AI for scripts + translation (Ollama). Skip with:  SKIP_AI=1 bash scripts/server_setup.sh =="
if [ "${SKIP_AI:-0}" = "1" ]; then
  echo "[i] skipped. Later run:  bash scripts/install_ai.sh"
else
  bash scripts/install_ai.sh || echo "[!] AI install failed. Run again later:  bash scripts/install_ai.sh   (without it fr/ar/es videos cannot be made)"
fi

echo
echo "DONE. Now check everything:"
./venv/bin/python pipeline.py --doctor
echo
echo "Next: nano .env   (add GEMINI_API_KEY for scripts+images, AZURE_SPEECH_KEY for the best voices - all free tiers)"
echo "Then: ./venv/bin/python pipeline.py --site --limit 1"
