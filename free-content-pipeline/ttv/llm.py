"""One interface for many AI text models. Tries providers in order, with retries, answer validation and fallbacks:
Gemini (free tier) -> OpenAI-compatible (Groq free tier, OpenRouter...) -> Claude (paid) -> local Ollama (free, offline).
The local Ollama path needs no key and no account: run  bash scripts/install_ai.sh  once."""
import json, os, re, shutil, subprocess, time, urllib.error, urllib.request


class LLMError(Exception):
    pass


def _post(url, body, headers, timeout):
    req = urllib.request.Request(url, json.dumps(body).encode("utf-8"),
                                 {"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def extract_json(text):
    text = re.sub(r"^\s*```(?:json)?|```\s*$", "", text.strip(), flags=re.M).strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise ValueError("no JSON object in the answer")
        return json.loads(m.group(0))


class Provider:
    def __init__(self, name, label, fn):
        self.name, self.label, self.fn = name, label, fn


def _model_matches(want, have):
    """'gemma3:4b' matches 'gemma3:4b'; 'gemma3' matches 'gemma3:latest'."""
    return want == have or (":" not in want and have.split(":")[0] == want)


class LLM:
    def __init__(self, cfg, tier_info):
        self.cfg = cfg.get("llm", {})
        self.tier_info = tier_info
        self.providers, self.notes, self.dead = [], [], set()
        self.ollama_url, self.ollama_model = None, None
        self._gemini = None
        for name in self.cfg.get("order", ["gemini", "openai", "anthropic", "ollama"]):
            p = getattr(self, "_make_" + name, lambda: None)()
            if p:
                self.providers.append(p)
        self.last_used = ""

    # ---- providers
    def _make_gemini(self):
        key = os.environ.get("GEMINI_API_KEY") or self.cfg.get("gemini_api_key", "")
        if not key:
            self.notes.append("Gemini: no GEMINI_API_KEY in .env (optional, free)")
            return None
        c = self.cfg.get("gemini", {})
        model, base = c.get("model", "gemini-2.5-flash"), c.get("base", "https://generativelanguage.googleapis.com")
        self._gemini = (key, model, base)

        def call(prompt, system, json_mode, max_tokens, temperature):
            body = {"contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature}}
            if system:
                body["systemInstruction"] = {"parts": [{"text": system}]}
            if json_mode:
                body["generationConfig"]["responseMimeType"] = "application/json"
            d = _post(f"{base}/v1beta/models/{model}:generateContent", body, {"x-goog-api-key": key}, 180)
            return "".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"])
        return Provider("gemini", f"Gemini ({model})", call)

    def _make_openai(self):
        key = os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY") \
            or self.cfg.get("openai_api_key", "")
        if not key:
            self.notes.append("Groq/OpenAI-compatible: no LLM_API_KEY in .env (optional, free)")
            return None
        c = self.cfg.get("openai", {})
        base, model = c.get("base", "https://api.groq.com/openai/v1").rstrip("/"), c.get("model", "llama-3.3-70b-versatile")

        def call(prompt, system, json_mode, max_tokens, temperature):
            msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
            body = {"model": model, "messages": msgs, "max_tokens": max_tokens, "temperature": temperature}
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            d = _post(base + "/chat/completions", body, {"Authorization": "Bearer " + key}, 180)
            return d["choices"][0]["message"]["content"]
        return Provider("openai", f"OpenAI-compatible ({model})", call)

    def _make_anthropic(self):
        key = os.environ.get("ANTHROPIC_API_KEY") or self.cfg.get("anthropic_api_key", "")
        if not key:
            return None
        c = self.cfg.get("anthropic", {})
        model, base = c.get("model", "claude-sonnet-5-5"), c.get("base", "https://api.anthropic.com")

        def call(prompt, system, json_mode, max_tokens, temperature):
            body = {"model": model, "max_tokens": max_tokens, "temperature": min(temperature, 1.0),
                    "messages": [{"role": "user", "content": prompt}]}
            if system:
                body["system"] = system
            d = _post(base + "/v1/messages", body, {"x-api-key": key, "anthropic-version": "2023-06-01"}, 180)
            return "".join(b.get("text", "") for b in d["content"])
        return Provider("anthropic", f"Claude ({model}, paid)", call)

    def _make_ollama(self):
        c = self.cfg.get("ollama", {})
        url = c.get("url", "http://localhost:11434").rstrip("/")
        try:
            with urllib.request.urlopen(url + "/api/tags", timeout=3) as r:
                have = [m["name"] for m in json.loads(r.read()).get("models", [])]
        except Exception:
            self.notes.append("Ollama (free local AI): NOT running or not installed -> run:  bash scripts/install_ai.sh")
            return None
        want = c.get("model", "auto")
        prefs = [want] if want != "auto" else list(self.tier_info.get("ollama_models") or ["gemma3:4b"])
        model = next((h for w in prefs for h in have if _model_matches(w, h)), None)
        if not model:                                        # any other chat model is better than nothing
            others = [h for h in have if "embed" not in h.lower()]
            if others:
                model = others[0]
                self.notes.append(f"Ollama: recommended model {prefs[0]} is not installed, using {model} "
                                  f"(translation quality may be lower). Better:  ollama pull {prefs[0]}")
        if not model:
            self.notes.append(f"Ollama is running but has no chat model -> run:  ollama pull {prefs[0]}")
            return None
        self.ollama_url, self.ollama_model = url, model
        ctx = int(c.get("num_ctx") or self.tier_info.get("ollama_ctx", 8192))

        def call(prompt, system, json_mode, max_tokens, temperature):
            msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
            body = {"model": model, "messages": msgs, "stream": False, "keep_alive": "20m",
                    "options": {"num_ctx": ctx, "num_predict": max_tokens, "temperature": temperature}}
            if json_mode:
                body["format"] = "json"
            return _post(url + "/api/chat", body, {}, int(c.get("timeout", 1800)))["message"]["content"]
        return Provider("ollama", f"Ollama local ({model})", call)

    # ---- use
    def available(self):
        return bool(self.providers)

    def describe(self):
        return " -> ".join(p.label for p in self.providers) or "none"

    def can_search_web(self):
        return self._gemini is not None

    def search_web(self, prompt, max_tokens=900):
        """Ask Gemini WITH Google Search. Returns (answer_text, [source urls]) or (None, [])."""
        if not self._gemini:
            return None, []
        key, model, base = self._gemini
        try:
            body = {"contents": [{"parts": [{"text": prompt}]}], "tools": [{"google_search": {}}],
                    "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.3}}
            d = _post(f"{base}/v1beta/models/{model}:generateContent", body, {"x-goog-api-key": key}, 120)
            cand = d["candidates"][0]
            text = "".join(p.get("text", "") for p in cand["content"]["parts"]).strip()
            urls = [c["web"]["uri"] for c in cand.get("groundingMetadata", {}).get("groundingChunks", []) if "web" in c]
            return (text or None), urls[:8]
        except Exception:
            return None, []

    def unload(self):
        """Free the RAM used by the local model (the video encoder needs it on small servers)."""
        if self.ollama_url:
            try:
                _post(self.ollama_url + "/api/generate", {"model": self.ollama_model, "keep_alive": 0}, {}, 20)
            except Exception:
                pass

    def ask(self, prompt, system=None, json_mode=True, max_tokens=4096, validate=None, temperature=0.7, tries=3):
        """Return parsed JSON (json_mode) or text. `validate(data)` may raise ValueError("what is wrong") and may
        return a cleaned value: the model is then asked again with that error. Falls back to the next provider."""
        errors = []
        for p in self.providers:
            if p.name in self.dead:
                continue
            ask_prompt = prompt
            for attempt in range(1, tries + 1):
                try:
                    text = p.fn(ask_prompt, system, json_mode, max_tokens, temperature)
                    data = extract_json(text) if json_mode else text.strip()
                    if validate:
                        data = validate(data)
                    self.last_used = p.label
                    return data
                except urllib.error.HTTPError as e:
                    errors.append(f"{p.name}: HTTP {e.code}")
                    if e.code in (401, 403, 404):          # bad key / unknown model: never going to work
                        self.dead.add(p.name); break
                    if e.code == 429 and attempt < tries:
                        time.sleep(20); continue
                    if e.code >= 500 and attempt < tries:
                        time.sleep(5); continue
                    break
                except (ValueError, KeyError, TypeError) as e:   # bad JSON or rejected by validate -> retry with the reason
                    errors.append(f"{p.name}: {e}")
                    if attempt < tries:
                        ask_prompt = (prompt + f"\n\nYour previous answer was rejected: {e}. "
                                      "Answer again and fix exactly that. Return one valid JSON object only.")
                        continue
                    break
                except Exception as e:
                    errors.append(f"{p.name}: {type(e).__name__}")
                    self.dead.add(p.name)
                    break
        raise LLMError("no AI provider gave a usable answer (" + "; ".join(errors[-4:]) + ")" if errors
                       else "no AI provider configured")


# ---- helpers used by the command line
def recommended_model(tier_info):
    return (tier_info.get("ollama_models") or ["gemma3:4b"])[0]


def install_ollama_model(tier_info, model=None):
    """Download the recommended model with the `ollama` program (free, one time, a few GB)."""
    model = model or recommended_model(tier_info)
    if not shutil.which("ollama"):
        print("[!] Ollama is not installed. On the server run:  bash scripts/install_ai.sh   "
              "(Windows: winget install Ollama.Ollama)")
        return False
    print(f"[i] downloading {model} (one time) ...")
    return subprocess.run(["ollama", "pull", model]).returncode == 0
