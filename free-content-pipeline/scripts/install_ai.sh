#!/usr/bin/env bash
# Installs the FREE local AI that writes the scripts and TRANSLATES to French / Arabic / Spanish.
# No account, no key, no payment. Run once as root inside the project folder:   bash scripts/install_ai.sh
# (inside tmux: the model download is a few GB)
set -e
cd "$(dirname "$0")/.."

echo "== 1/4 Ollama (the program that runs the AI model locally) =="
if ! command -v ollama >/dev/null 2>&1; then
  command -v curl >/dev/null 2>&1 || { apt-get update -y && apt-get install -y curl zstd; }
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "[ok] Ollama already installed"
fi

echo "== 2/4 Start the Ollama service =="
systemctl enable --now ollama >/dev/null 2>&1 || (nohup ollama serve > /tmp/ollama.log 2>&1 &)
for i in $(seq 1 20); do
  curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1 || { echo "[!] Ollama did not start. See: journalctl -u ollama -n 30"; exit 1; }

echo "== 3/4 Download the model chosen for THIS server =="
PY=./venv/bin/python; [ -x "$PY" ] || PY=python3
MODEL="${1:-$($PY pipeline.py --print-ai-model)}"
echo "model: $MODEL   (override:  bash scripts/install_ai.sh gemma3:12b)"
ollama pull "$MODEL"

echo "== 4/4 Check: real translation test (French, Arabic, Spanish) =="
$PY pipeline.py --doctor --test-ai
echo
echo "DONE. Now run:  ./venv/bin/python pipeline.py --site --limit 1"
