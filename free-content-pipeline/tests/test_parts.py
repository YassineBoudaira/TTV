"""Unit tests: audio timing, voice fallback, image quality gate, art prompts, fonts, languages."""
import io, json, math, re, subprocess, sys, tempfile, unittest, wave, struct
from pathlib import Path
from unittest import mock
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from PIL import Image
from ttv import art, images, langs, render, scriptai, tts
from ttv.config import DEFAULTS


def tone(path, secs):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"sine=frequency=180:duration={secs}",
                    "-af", "tremolo=f=5:d=0.5", "-ar", "24000", "-ac", "1", str(path)], check=True)


class Audio(unittest.TestCase):
    def test_scene_length_is_an_exact_number_of_frames_with_a_natural_pause(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d); tone(d / "a.wav", 3.2)
            frames, dur, speech, lead = render.scene_audio(d / "a.wav", "A full sentence.", 30, DEFAULTS, d / "p.wav")
            self.assertAlmostEqual(frames / 30, dur, places=6)
            self.assertAlmostEqual(render.duration(d / "p.wav"), dur, delta=0.02)
            self.assertGreaterEqual(dur - speech - lead, DEFAULTS["gap_sentence"] - 0.04)        # pause after a sentence
            _, dur2, sp2, ld2 = render.scene_audio(d / "a.wav", "half way,", 30, DEFAULTS, d / "q.wav")
            self.assertLess(dur2 - sp2 - ld2, dur - speech - lead)                               # shorter pause after a comma

    def test_joined_track_is_gapless_and_as_long_as_the_video_clips(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d); pads, total = [], 0.0
            for i, secs in enumerate((2.1, 3.4, 2.7)):
                tone(d / f"r{i}.wav", secs)
                f, dur, *_ = render.scene_audio(d / f"r{i}.wav", "Sentence.", 24, DEFAULTS, d / f"p{i}.wav")
                pads.append(d / f"p{i}.wav"); total += f / 24
            render.build_audio(pads, [0, 1, 2], d / "all.m4a", d, DEFAULTS)
            self.assertAlmostEqual(render.duration(d / "all.m4a"), total, delta=0.06)

    def test_captions_use_word_timings_when_available(self):
        with tempfile.TemporaryDirectory() as d:
            wav = Path(d) / "x.wav"; wav.write_bytes(b"x")
            Path(str(wav) + ".words.json").write_text(json.dumps([[0.0 + i * 0.5, 0.4 + i * 0.5, "w"] for i in range(6)]))
            secs = render.timed_chunks(["one two three", "four five six"], wav, 0.06, 3.0, 3.8)
            self.assertAlmostEqual(sum(secs), 3.8, places=3)
            self.assertAlmostEqual(secs[0], 0.06 + 1.5, places=2)                                # second chunk starts at word 4


class Voice(unittest.TestCase):
    def setUp(self):
        tts._fail.clear()

    def fake(self, ok):
        def f(text, lang, out, cfg):
            if not ok:
                raise ConnectionError("down")
            Path(out).write_bytes(b"0" * 2000)
        return f

    def test_falls_back_in_order_and_skips_a_broken_engine(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.dict(tts.ENGINES, {"azure": self.fake(False), "edge": self.fake(True)}):
            cfg = dict(DEFAULTS, tts_order=["azure", "edge"])
            self.assertEqual(tts.speak("hi", "en", Path(d) / "a.wav", cfg), "edge")
            tts.speak("hi", "en", Path(d) / "b.wav", cfg)
            self.assertEqual(tts._fail["azure"], 2)                                              # the circuit breaker opens
            self.assertEqual(tts.speak("hi", "en", Path(d) / "c.wav", cfg), "edge")

    def test_missing_key_is_not_counted_as_a_failure(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.dict("os.environ", {}, clear=False):
            import os
            os.environ.pop("AZURE_SPEECH_KEY", None)
            with mock.patch.dict(tts.ENGINES, {"edge": self.fake(True)}):
                tts.speak("hi", "en", Path(d) / "a.wav", dict(DEFAULTS, tts_order=["azure", "edge"]))
            self.assertEqual(tts._fail.get("azure", 0), 0)

    def test_language_specific_order(self):
        cfg = dict(DEFAULTS, tts_order_by_lang={"ar": ["edge"]}, tts_order=["azure"])
        self.assertEqual(tts.order_for("ar", cfg), ["edge", "silent"])
        self.assertEqual(tts.order_for("en", cfg), ["azure", "silent"])


class Images(unittest.TestCase):
    def png(self, flat):
        im = Image.new("RGB", (1024, 1024), (90, 90, 90))
        if not flat:                                   # big areas of different brightness, like a real photograph
            import random
            from PIL import ImageDraw
            r, d = random.Random(1), ImageDraw.Draw(im)
            for x in range(0, 1024, 128):
                for y in range(0, 1024, 128):
                    d.rectangle((x, y, x + 127, y + 127), fill=(r.randint(0, 255),) * 3)
        b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()

    def test_quality_gate(self):
        with tempfile.TemporaryDirectory() as d:
            images._save_valid(self.png(False), Path(d) / "ok.jpg")
            with self.assertRaises(ValueError):
                images._save_valid(self.png(True), Path(d) / "flat.jpg")
            small = io.BytesIO(); Image.new("RGB", (100, 100)).save(small, "PNG")
            with self.assertRaises(ValueError):
                images._save_valid(small.getvalue(), Path(d) / "small.jpg")

    def test_refused_provider_is_skipped_for_the_rest_of_the_run(self):
        import urllib.error
        images._dead.clear(); images._fails.clear()
        calls = []

        def refuse(prompt, cfg, out):
            calls.append(1); raise urllib.error.HTTPError("u", 402, "payment", {}, None)
        with mock.patch.dict(images.PROVIDERS, {"gemini": refuse}), mock.patch.dict("os.environ", {"GEMINI_API_KEY": "k"}):
            cfg = dict(DEFAULTS, image_providers=["gemini"])
            self.assertFalse(images.generate("p", cfg, Path("/tmp/x.jpg")))
            self.assertFalse(images.generate("p", cfg, Path("/tmp/x.jpg")))
        self.assertEqual(len(calls), 1)
        images._dead.clear()


class FakeLLM:
    """Stands in for the AI: runs the real validation on a canned answer."""
    def __init__(self, answer): self.answer = answer
    def ask(self, prompt, system=None, json_mode=True, max_tokens=0, validate=None, temperature=0.5, tries=1):
        return validate(self.answer) if validate else self.answer


class Art(unittest.TestCase):
    tier = {"article_chars": 3000}

    def test_analysis_requires_a_subject(self):
        ok = art.analyze("T", "body", self.tier, FakeLLM({"subjects": "an adult beagle", "entities": [{"name": "Beagle", "kind": "dog breed"}]}))
        self.assertEqual(ok["entities"][0]["name"], "Beagle")
        with self.assertRaises(ValueError):
            art.analyze("T", "body", self.tier, FakeLLM({"entities": []}))

    def test_prompts_must_match_the_scene_count_and_be_detailed(self):
        master = {"scenes": [{"narration": "a"}, {"narration": "b"}]}
        an = {"topic": "t", "subjects": "s", "setting": "", "mood": "", "avoid": []}
        good = {"scenes": [{"shot": "wide", "prompt": "A wide photograph of an adult beagle sitting in a sunny garden, soft light, 85mm lens, natural mood"}] * 2}
        self.assertEqual(len(art.prompts(master, an, {"notes": []}, FakeLLM(good), self.tier)), 2)
        with self.assertRaises(ValueError):
            art.prompts(master, an, {"notes": []}, FakeLLM({"scenes": good["scenes"][:1]}), self.tier)
        with self.assertRaises(ValueError):
            art.prompts(master, an, {"notes": []}, FakeLLM({"scenes": [{"prompt": "dog"}] * 2}), self.tier)

    def test_final_prompt_adds_realism_and_exclusions(self):
        p = art.final_prompt("A dog in a park.", DEFAULTS)
        self.assertIn("documentary photograph", p); self.assertIn("no watermark", p)


class Text(unittest.TestCase):
    def test_every_language_has_a_font_with_its_letters(self):
        for code, d in langs.LANGS.items():
            f = render.find_font({}, 40, d["sample"])
            self.assertTrue(render._covers(f.path, "".join(sorted(set(d["sample"].replace(" ", ""))))), code)

    def test_font_check_detects_missing_letters(self):
        dj = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if Path(dj).exists():
            self.assertTrue(render._covers(dj, "abcé"))
            self.assertFalse(render._covers(dj, "漢字"))

    def test_language_detection_and_validation(self):
        self.assertEqual(langs.detect("The dog and the cat are in the garden with you"), "en")
        self.assertEqual(langs.detect("Le chien et le chat sont dans le jardin avec vous"), "fr")
        self.assertEqual(langs.detect("El perro y el gato están en el jardín con los niños"), "es")
        self.assertEqual(langs.detect("الكلب والقطة في الحديقة مع الأطفال اليوم"), "ar")
        self.assertTrue(langs.is_lang("Los perros necesitan agua fresca todos los días", "es"))
        self.assertFalse(langs.is_lang("Dogs need fresh water every day and the bowl must be clean", "fr"))

    def test_fallback_script_ends_with_the_call_to_action(self):
        s = scriptai.fallback_script("T", "One. Two. Three! Four?", "fr", "site.com", {"max_scenes": 6})
        self.assertIn("site.com", s["scenes"][-1]["narration"])


if __name__ == "__main__":
    unittest.main()
