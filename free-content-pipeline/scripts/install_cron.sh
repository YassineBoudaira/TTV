#!/usr/bin/env bash
# Runs the pipeline every day at 03:00 on new posts of your site (never two runs at once).
HERE="$(cd "$(dirname "$0")/.." && pwd)"
LINE="0 3 * * * cd $HERE && flock -n /tmp/pipeline.lock ./venv/bin/python pipeline.py --site >> $HERE/run.log 2>&1"
( crontab -l 2>/dev/null | grep -v "pipeline.py --site"; echo "$LINE" ) | crontab -
echo "[ok] daily run installed. Logs: $HERE/run.log   (remove with: crontab -e)"
