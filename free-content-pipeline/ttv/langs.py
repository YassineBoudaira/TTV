"""Language registry: add a language here and the whole pipeline supports it."""
import re

HAS_AR = re.compile(r"[\u0600-\u06FF]")

LANGS = {
    "en": {"name": "English", "espeak": "en", "piper": "en/en_US/lessac/medium|en_US-lessac-medium",
           "edge": "en-US-AriaNeural", "azure": "en-US-AriaNeural", "cta": "Read the full guide on {site}.",
           "sample": "How to choose the right food",
           "stop": "the and is to of in for with that you are on it this can your have".split()},
    "fr": {"name": "French", "espeak": "fr", "piper": "fr/fr_FR/siwis/medium|fr_FR-siwis-medium",
           "edge": "fr-FR-DeniseNeural", "azure": "fr-FR-DeniseNeural", "cta": "Lisez le guide complet sur {site}.",
           "sample": "Comment bien choisir à l'écoute œuvre",
           "stop": "le la les des une est et pour que dans avec sur vous nous pas du au qui ce sont".split()},
    "es": {"name": "Spanish", "espeak": "es", "piper": "es/es_ES/davefx/medium|es_ES-davefx-medium",
           "edge": "es-ES-ElviraNeural", "azure": "es-ES-ElviraNeural", "cta": "Lee la guía completa en {site}.",
           "sample": "¿Cómo elegir la comida? ¡Aquí está!",
           "stop": "el la los las de que y en un una es por con para no se su al lo como más pero".split()},
    "ar": {"name": "Arabic", "espeak": "ar", "piper": "ar/ar_JO/kareem/medium|ar_JO-kareem-medium",
           "edge": "ar-SA-ZariyahNeural", "azure": "ar-SA-ZariyahNeural", "cta": "اقرأ الدليل الكامل على {site}.",
           "sample": "كيف تختار الطعام المناسب لكلبك",
           "stop": []},
}


def name(code):
    return LANGS.get(code, {}).get("name", code)


def detect(text):
    """Guess the language of a text: Arabic by script, others by common words."""
    if len(HAS_AR.findall(text)) > 10:
        return "ar"
    low = text.lower()
    words = re.findall(r"[a-zà-ÿñ¿¡']+", low)
    scores = {c: sum(w in set(d["stop"]) for w in words) for c, d in LANGS.items() if c != "ar"}
    scores["fr"] += len(re.findall(r"[àâçèêëîïôûùüœ]", low)) * 0.3
    scores["es"] += len(re.findall(r"[ñ¿¡]", low)) + len(re.findall(r"[áíóú]", low)) * 0.15
    return max(scores, key=scores.get) if any(scores.values()) else "en"


# ---- language validation: refuse a "translation" that is not really in the target language -------------
_UNIQUE = {   # words that belong to ONE language only (shared words like "la", "en", "que", "son" are left out)
    "en": set("the and of to is are for with that you your this it can be will have from they but what not in as at by".split()),
    "fr": set("le les des une est et pour dans avec sur vous votre pas du au qui ce sont mais ses plus être aussi nous ils il elle ne chaque très".split()),
    "es": set("el los las una es por con para del su sus como más pero está muy también tu tus lo al y cada".split()),
}


def _letters(text):
    return [c for c in text if c.isalpha()]


def is_lang(text, code):
    """True if `text` really looks like it is written in `code` (en/fr/es/ar). Short texts are judged leniently."""
    letters = _letters(text)
    if not letters:
        return True
    ar = sum(1 for c in letters if "\u0600" <= c <= "\u06FF") / len(letters)
    if code == "ar":
        return ar >= 0.6
    if ar > 0.2:
        return False
    words = re.findall(r"[^\W\d_]+", text.lower())
    if len(words) < 5:
        return True
    scores = {c: sum(w in u for w in words) for c, u in _UNIQUE.items() if c in _UNIQUE}
    if code == "fr":
        scores["fr"] += len(re.findall(r"[àâçèêëîïôûùüœ]", text.lower())) * 0.5
    if code == "es":
        scores["es"] += len(re.findall(r"[ñ¿¡áíóú]", text.lower())) * 0.5
    best = max(scores.values())
    if best == 0:
        return True                                      # no evidence either way
    return scores.get(code, 0) >= best
