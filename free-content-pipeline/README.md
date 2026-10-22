# Article-to-Video Pipeline (`ttv`)

**English** | [العربية](README.ar.md)

Reads the posts of your **WordPress** site and turns every post, automatically, into videos for YouTube, YouTube Shorts, TikTok and Instagram
in **English, French, Arabic and Spanish**. Free tiers only, no mandatory subscription, runs on a small VPS or on your PC.

> **Honesty note.** This version was tested with **offline mock services** (a fake WordPress site, fake Gemini / Cloudflare / Azure / Wikipedia / Ollama)
> and with unit tests (38 tests). It was **not** tested against the real cloud APIs, and nobody listened to the real voices from the development
> environment. Always try one post first (`--limit 1`) and listen before you publish. See [Limits](#limits-and-what-is-not-tested).

## What you get for every post and every language

| File | Content |
|---|---|
| `video_16x9.mp4` | landscape video for YouTube |
| `short_9x16.mp4` | vertical video under 58 s: hook first, call to action last (Shorts / TikTok / Reels) |
| `minis/mini_XX_9x16.mp4` | vertical clips of about 35 s, made only when the video is long |
| `thumbnail.jpg`, `subtitles.srt`, `publish.txt` | thumbnail, YouTube subtitles, title / description / hashtags / TikTok and Instagram captions |

Inside the video: a **hook** in the first sentence, short spoken sentences, **realistic AI images** chosen by an art-director step that studied the article,
slow zoom / pan motion, animated captions (3 words at a time vertical, 6 wide), one continuous voice track with natural pauses, correct right-to-left Arabic.

## Quick start (VPS, Ubuntu 24.04)

Details and screenshots-level steps: [docs/OPERATIONS.md](docs/OPERATIONS.md).

1. **On your PC** (PowerShell): `scp .\free-content-pipeline.zip root@IP:/root/`
2. `ssh root@IP`, then `apt-get update && apt-get install -y unzip && cd /root && unzip -o free-content-pipeline.zip && cd free-content-pipeline`
3. `bash scripts/server_setup.sh` (FFmpeg, fonts, voices, firewall, local AI, final check).
   Already installed an older version? Use `unzip -o ... -x "free-content-pipeline/config.json"` then `bash scripts/upgrade.sh` instead.
4. `nano .env` and add your **free** keys (see [Keys](#keys-all-have-a-free-tier)). Minimum: `GEMINI_API_KEY`.
5. `./venv/bin/python pipeline.py --doctor` (everything should say ok) and `./venv/bin/python pipeline.py --test-ai` (translation sample).
6. `tmux` then `./venv/bin/python pipeline.py --site --limit 1`.
7. Download: `scp -r root@IP:/root/free-content-pipeline/output .` (from your PC). Listen, then publish.
8. Automatic every night: `bash scripts/install_cron.sh`.

## Commands

| Goal | Command (inside the project folder) |
|---|---|
| Check machine, keys, voices, fonts | `./venv/bin/python pipeline.py --doctor` |
| Translate a test sentence into every language | `... --test-ai` |
| Process the next post(s) of the site | `... --site --limit 1` |
| **Show what is done / failed per post** | `... --status` |
| Work on one specific post (even if finished) | `... --site --only post-slug` |
| Redo finished posts too (after the new ones) | `... --site --force` |
| Retry languages that failed 3 times | `... --site --retry-failed` |
| Scripts only, no video | `... --site --dry-run` |
| Some languages / formats only | `--langs en,fr` / `--formats tall` |
| Edited posts: rebuild now (when `on_edit` is `report_only`) | `... --site --apply-edits` |
| One article file | `... articles/my-post.md` |
| Force a power profile | `--profile lite|standard|strong|max` |
| Disk usage per post | `... --disk` |
| Redo one language of a post | `... --site --only post-slug --langs fr` |
| Delete a language / a post (asks YES first) | `... --delete-lang post-slug fr` / `... --delete-post post-slug [--keep-ignored]` |
| Never process a post / process it again | `... --ignore-post post-slug` / `... --unignore-post post-slug` |
| Delete old archived versions / the research cache | `... --prune-archive 30` / `... --clean-cache` |

## Posts are never repeated

Every run compares the site with `state.json`. A post is in exactly one state:

`new` → `partial` / `complete`; an edit makes it `edited`; a language that fails 3 times makes it `gave_up`.
The queue is **new, then edited, then partial**. Finished posts are skipped, so `--limit 1` run again and again **moves on to the next post**.
A failing language never blocks the other posts. See [diagram 03](docs/diagrams/en/03-post-states.png).

**Edited posts** are detected by a hash of the text (not by the "modified" date). When one is found you get a diff in the console and in
`output/_reports/edits.md`, and (setting `on_edit`):

* `archive` (default): old videos move to `output/_archive/<slug>/rev<N>_<date>/`, new videos are made in `output/<slug>/`, plus a `CHANGELOG.md`.
* `new_folder`: old videos stay, new ones go to `output/<slug>--rev<N+1>/`.
* `report_only`: nothing is rebuilt until you run `--apply-edits`.

A changed date with identical text is reported and ignored.

## Quality

* **Script**: the AI reads the whole article, writes a hook and short scenes using only facts from the article, then **localizes** (not word-for-word) for each language with checks: right language, same number of scenes. Small local models fall back to one-sentence plain-text translation.
* **Images** ([art.py](ttv/art.py)): analyze the article (breed, setting, mood) → research how the real subjects look (Wikipedia, plus Google Search through Gemini) → one detailed photographic prompt per scene with varied shots → generate (Nano Banana, then Cloudflare FLUX) → quality gate (not tiny, not blank) → fall back to the article's own photos. Prompts are saved in `output/<slug>/assets/prompts.json`.
* **Voice**: Azure neural (official, free tier) → Edge neural (free, unofficial) → Piper (offline) → system voices. One continuous audio track per video, pauses of 0.45 s after a sentence, loudness −16 LUFS, AAC encoded once.

## Keys (all have a free tier)

Put them in `.env` (never share it). `--doctor` tells you what is missing.

| Key | Gives you | Where |
|---|---|---|
| `GEMINI_API_KEY` | scripts, translation, web research, Nano Banana images | aistudio.google.com/apikey |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | best voices (free tier 500,000 characters/month) | Azure portal → Speech resource (F0) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | FLUX.1 images (free 10,000 neurons/day) | dash.cloudflare.com → AI → Workers AI |
| `LLM_API_KEY` (optional) | Groq as a second text model | console.groq.com |
| `ANTHROPIC_API_KEY` (optional, **paid**) | best script quality | console.anthropic.com |

Free quotas change. Without any key the project still works with the local model (`bash scripts/install_ai.sh`) and the article's own photos, with lower quality.

## Configuration

`config.json` (missing keys use safe defaults): `site_url`, `brand`, `target_langs`, `formats`, `profile`, `posts_per_run`, `order`, `on_edit`, `max_attempts`,
`short_max_seconds`, `mini_seconds`, `minis`, `music`, `ai_images`, `art_director`, `image_providers`, `image_style`, `image_negative`, `research`,
`llm` (order and models), `tts_order`, `tts_order_by_lang`, `tts_voices`, `gap_sentence`, `gap_clause`, `loudness`, `transition`, `font`.
Environment: `PIPELINE_CONFIG` (another config file), `TTV_HOME` (another data folder).
The machine is measured automatically (`hw.py`): `lite` 720p, `standard` / `strong` / `max` 1080p with more parallel work.

## Project tree

```
free-content-pipeline/
├── pipeline.py              launcher (keeps the usual command)
├── config.json  .env  .env.example  requirements.txt
├── ttv/                     the program
│   ├── cli.py               commands, planning, edit handling
│   ├── postflow.py          one post -> all languages
│   ├── state.py             post lifecycle: new / edited / partial / complete
│   ├── wpsync.py            WordPress reader (REST, RSS), images, content hash
│   ├── scriptai.py          script, hook, localization, fallback script
│   ├── art.py               art director: analysis, research, photo prompts
│   ├── llm.py               text AI chain: Gemini, Groq, Claude, Ollama
│   ├── images.py            Nano Banana, Cloudflare FLUX, quality gate
│   ├── tts.py               voices: Azure, Edge, Gemini, Piper, Windows, espeak
│   ├── render.py            fonts, captions, motion, audio track, FFmpeg
│   ├── manage.py            disk, delete, ignore, prune commands
│   ├── langs.py  hw.py  config.py  report.py  doctor.py
├── scripts/                 server_setup.sh  upgrade.sh  install_ai.sh  install_cron.sh  *.bat
├── tests/                   mocks.py (offline services)  test_state.py  test_parts.py
├── docs/                    ARCHITECTURE  OPERATIONS  REVIEW (EN + AR)  diagrams/{en,ar}
├── articles/  media/  music/  voices/  output/  state.json   (your data, created automatically)
```

## Diagrams

All diagrams exist in English and Arabic (SVG + PNG) in `docs/diagrams/en` and `docs/diagrams/ar`.

![Architecture](docs/diagrams/en/01-architecture.png)

![Flow of one post](docs/diagrams/en/02-post-flow.png)

More: [states](docs/diagrams/en/03-post-states.png) · [audio and video build](docs/diagrams/en/04-audio-video-build.png) · [fallback chains](docs/diagrams/en/05-provider-fallbacks.png) · [deployment](docs/diagrams/en/06-deployment.png) · [folders](docs/diagrams/en/07-folders.png) · [modules](docs/diagrams/en/08-modules.png).
Rebuild them with `python3 docs/diagrams/build_diagrams.py` (needs Graphviz).

## Documentation

* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): every module, data, rules, extension points
* [docs/OPERATIONS.md](docs/OPERATIONS.md): install, upgrade, keys, daily use, moving to a bigger server, troubleshooting, security
* [docs/REVIEW.md](docs/REVIEW.md): review of the previous version: what was wrong, the evidence, the fix
* [CHANGELOG.md](CHANGELOG.md)

## Tests

```
python3 tests/test_state.py && python3 tests/test_parts.py && python3 tests/test_robustness.py        # 38 unit tests, no internet needed
python3 tests/mocks.py 8765                                       # offline fake services for experiments
```

## Limits and what is not tested

* Not tested against the real Gemini, Groq, Claude, Cloudflare, Azure, Edge and Wikipedia services (only against mocks that copy their documented request shapes). Free quotas and model names change.
* The sound quality of the real voices is unknown to the author: listen first. The Arabic voice of Piper expects diacritized text and is probably weak; use Azure or Edge for Arabic.
* Caption timing is exact only with Edge voices (word timings); otherwise estimated from text length.
* Images are still pictures with zoom / pan, not video generation (Veo is paid per second and is not included). AI images can still contain mistakes: review the first videos of each topic, especially health and food advice.
* Publishing to the platforms is manual. You are responsible for music / image rights and for each platform's rules about AI-generated content.
