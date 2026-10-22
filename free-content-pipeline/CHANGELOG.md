# Changelog / سجل التغييرات

## 2.0.1

**Fixed / تم إصلاحه**
* Crash `'bool' object has no attribute 'get'` (a `config.json` with `"research": true`): settings of the wrong type are now converted or ignored with a message, and a broken JSON file gives a clear message. All posts stayed empty because of this crash.
* One unexpected error inside a post no longer stops the run or loops on it: it is recorded as a failed attempt and the next post is processed.
* Translation with small local models (French / Spanish failed with `far too long`): the model is asked to answer inside `<t></t>` and verbose answers (intro lines, options, notes) are cleaned.
* Art direction is skipped when no image provider is configured (saves minutes of CPU on a small server).
* A known post with no finished language is shown as NEW, not "RETRY".

## 2.0.0

**Fixed / تم إصلاحه**
* Same post processed again and again (state machine, 3 attempts per language, queue new → edited → partial). تكرار المقال نفسه.
* Edited posts are detected by a text hash, shown as a diff, archived or put in a new folder (`on_edit`). رصد المقالات المعدّلة.
* Choppy sound: one continuous audio track, exact frame lengths, natural pauses, loudness normalised, AAC encoded once. الصوت المتقطع.
* Pollinations (HTTP 402) removed; Cloudflare FLUX added; refused providers skipped; image quality gate.
* A network failure is no longer reported as "all done"; a changed permalink keeps its folder; dry-run changes nothing.
* Translation: one-sentence plain-text fallback for small local models.

**Added / تمت إضافته**
* `art.py` art director: article analysis, Wikipedia + Google Search research, realistic photo prompts saved in `assets/prompts.json`.
* Voices: Azure Speech (official free tier), Edge with word timings, Gemini TTS; order per language; circuit breaker.
* Commands: `--status`, `--only`, `--retry-failed`, `--on-edit`, `--apply-edits`; reports in `output/_reports/`.
* `scripts/upgrade.sh` (keeps your data and migrates `config.json`), `TTV_HOME`, `.env.example` with all keys.
* Documentation in English and Arabic, 8 diagrams in both languages (Graphviz), 38 unit tests, offline mock services.

* Housekeeping commands: `--disk`, `--delete-post`, `--delete-lang`, `--ignore-post`, `--unignore-post`, `--prune-archive`, `--clean-cache` (always ask YES). `--status` shows missing languages. `--only` with `--langs` resets only those languages.

**Changed / تغيّر**
* Layout: `ttv/` package, `scripts/`, `docs/`, `tests/`; `pipeline.py` stays as the launcher. Scripts moved: `bash scripts/server_setup.sh`, `scripts/install_ai.sh`, `scripts/install_cron.sh`.
* Default voice order: Azure → Edge → Piper → Windows → espeak. Default captions: no dip-to-black between scenes (`transition` 0).
