# Review of the previous version / مراجعة النسخة السابقة

Reviewed: the zip you sent (README of 451 lines, `install_ai.sh`, `tests/mocks.py`, improved `llm.py` / `scriptai.py`) and your screenshots.
Method: read every file, diff against the delivered version, then **reproduce** each problem (offline mocks, measurements) before fixing it.
تمت مراجعة الملف الذي أرسلته وصور الشاشة: قراءة كل ملف، ومقارنته بما سُلّم، ثم **إعادة إنتاج** كل مشكلة (بمحاكيات ومقاييس) قبل إصلاحها.

## What was already good / ما كان جيداً

* `llm.py`: validation callback, dead-provider handling, Ollama chat and `install_ollama_model`; `scriptai.py`: chunked translation with language check; `install_ai.sh`; `tests/mocks.py`; the long README.
* وحدة `llm.py` بفحص الإجابات والتعامل مع المزوّد المتعطل، وترجمة على دفعات مع فحص اللغة، وسكربت `install_ai.sh`، والمحاكيات، والشرح المفصّل.

## Findings and fixes / النتائج والإصلاحات

| # | Finding / الملاحظة | Evidence / الدليل | Fix / الإصلاح |
|---|---|---|---|
| 1 | **The same post is processed again and again.** A post with a failed language was re-queued every run and, being the newest, was always first; `--force` made it worse. تكرار المقال نفسه. | `pipeline.py` re-queued `any(lang not in langs)`; reproduced with 3 consecutive `--limit 1` runs. The unit test `test_failed_language_does_not_block_new_posts` fails on the old logic. | `state.py`: states new / edited / partial / gave_up / meta / complete; queue = new → edited → partial; 3 attempts per language; `--only`, `--retry-failed`, `--status`. Now run 2 moves to another post (verified). |
| 2 | **No tracking of edited posts.** Only the `modified` date was compared, and only to re-queue. لا رصد للتعديل. | code review | Hash of the text; diff in console and `edits.md`; `on_edit` = archive / new_folder / report_only; date-only changes ignored; `CHANGELOG.md` per post. |
| 3 | **Choppy sound.** Scene audio was AAC-encoded per scene, faded, and the clip was cut with `-shortest`, so the planned 0.35 s pause was lost. الصوت متقطع. | Measured: **0.06 s** between sentences and 23 ms audio/video drift on a 5-scene test. | Silent clips of exact frame length + **one continuous audio track** (lossless join, loudness −16 LUFS, AAC once). Measured now: **0.54 s** pauses and audio length = video length (25.000 s = 25.000 s). |
| 4 | **Arabic voice quality.** The default order put Piper first. Piper's Arabic model expects diacritized text, so undiacritized text is probably pronounced badly. الصوت العربي. | Cannot be measured without listening (probable, not proven). Your screenshot shows Piper was used for `ar`. | Default order Azure → Edge → Piper; Azure Speech (official free tier) and Edge word timings; `--doctor` warns when Arabic would use Piper; `upgrade.sh` migrates your `tts_order`. **You must listen** to confirm. |
| 5 | **Pollinations returns HTTP 402** (your screenshot: `image provider pollinations failed (402)`), so only one article photo was used for every scene. | screenshot | Removed. Providers: Gemini (Nano Banana) and Cloudflare FLUX; refused providers (401/402/403) are skipped at once; clear message; quality gate; `--doctor` tells which keys are missing. |
| 6 | **Image prompts did not understand the article** (one generic sentence per scene), so images were not realistic. جودة الصور. | code review | `art.py`: analysis → research (Wikipedia + Google Search via Gemini) → one 40–70 word photographic prompt per scene with varied shots and a fixed recurring subject; realism style and exclusions; prompts saved. |
| 7 | **Translation failed with `gemma3:4b`** (`items must be a list of exactly 1 strings`, `item 1 is far too long`). | your screenshot of the translation test | After two failed JSON tries the text is translated **one sentence at a time as plain text** with cleaning of quotes / "Translation:" prefixes. A real model (Gemini / Groq) is still better. |
| 8 | **A network problem was reported as "all posts done".** With 0 posts read, the plan was empty and every known post would have been flagged as removed. | found by the end-to-end test when the mock server died | The run now stops with a clear message and changes nothing. |
| 9 | **A changed permalink would have created a second folder** and lost the link to the old videos. | found by the end-to-end test | A post keeps the folder name it first got (`state.json`). |
| 10 | **`--dry-run` could move files of edited posts.** | found while testing | Dry-run never archives or rebuilds. |
| 11 | **Project layout and docs.** 8 modules + 5 scripts in one folder; `README_AR.md` (37 lines) contradicted `README.md` (451 lines); no English README; no diagrams; no upgrade path. | file listing | Package `ttv/`, `scripts/`, `docs/`, `tests/`; README + guides in English and Arabic; 8 diagrams in both languages; `upgrade.sh`; `TTV_HOME`. |
| 12 | **My earlier instruction `--force` for the first test** made the first post re-run each time. | your screenshot | `--force` now only adds finished posts after the new ones; `--only` is the right tool. |

## README review / مراجعة ملفات الشرح

Accurate and kept: install steps, key table, troubleshooting idea. Corrected: Pollinations as a free provider, Piper as the first voice, "post is skipped when done" (was false), missing `--status`, outdated file tree, count of tests, absence of Arabic / English twins, absence of diagrams.
