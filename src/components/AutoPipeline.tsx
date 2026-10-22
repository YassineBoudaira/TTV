import React, { useState, useEffect } from 'react';
import {
  FileText,
  Play,
  Settings,
  Activity,
  CheckCircle2,
  AlertCircle,
  Globe,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Video,
  Layers,
  ChevronRight,
  Sliders,
  Send,
  BookOpen
} from 'lucide-react';

interface Scene {
  sceneNum: number;
  narration: string;
  visual: string;
  durationEst: string;
}

interface ScriptResponse {
  title: string;
  hook: string;
  scenes: Scene[];
  description: string;
  hashtags: string[];
  tiktok_caption: string;
  instagram_caption: string;
  lang: string;
}

export const AutoPipeline: React.FC<{ onNavigateToVps: () => void }> = ({ onNavigateToVps }) => {
  const [subTab, setSubTab] = useState<'create' | 'config' | 'doctor'>('create');
  
  // Form State
  const [articleTitle, setArticleTitle] = useState<string>('How to Choose the Right Food for Your Pet');
  const [articleBody, setArticleBody] = useState<string>(
    'Choosing the right diet is essential for your pet’s health, energy, and lifespan. High-protein, balanced ingredients with real meat, omega fatty acids, and essential vitamins support strong muscles, a shiny coat, and healthy digestion. Always consult your veterinarian before switching diets and introduce new food gradually over seven days.'
  );
  const [wpUrl, setWpUrl] = useState<string>('');
  const [targetLang, setTargetLang] = useState<string>('en');
  const [videoFormat, setVideoFormat] = useState<'wide' | 'tall'>('tall');
  const [siteBrand, setSiteBrand] = useState<string>('nestpetanimals.com');

  // Execution State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scriptResult, setScriptResult] = useState<ScriptResponse | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Doctor & Config State
  const [doctorData, setDoctorData] = useState<any>(null);
  const [pipelineConfig, setPipelineConfig] = useState<any>(null);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState<boolean>(false);

  // Load doctor and config on mount
  useEffect(() => {
    fetch('/api/pipeline/doctor')
      .then((res) => res.json())
      .then((data) => setDoctorData(data))
      .catch(() => {});

    fetch('/api/pipeline/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setPipelineConfig(data.config);
          if (data.config.brand) setSiteBrand(data.config.brand);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleImportSample = () => {
    fetch('/api/pipeline/parse-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleSlug: 'example-en' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.title && data.body) {
          setArticleTitle(data.title);
          setArticleBody(data.body);
        }
      })
      .catch((err) => console.error(err));
  };

  const handleFetchWpUrl = async () => {
    if (!wpUrl.trim()) return;
    try {
      setIsProcessing(true);
      const res = await fetch('/api/pipeline/parse-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: wpUrl }),
      });
      const data = await res.json();
      if (data.title && data.body) {
        setArticleTitle(data.title);
        setArticleBody(data.body);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunPipeline = async () => {
    if (!articleTitle || !articleBody) return;
    try {
      setIsProcessing(true);
      setScriptResult(null);

      // Visual progress simulator steps
      setActiveStep(1); // Ingesting
      setTimeout(() => setActiveStep(2), 700); // AI Script & Hook
      setTimeout(() => setActiveStep(3), 1500); // Visual art director
      setTimeout(() => setActiveStep(4), 2200); // Multi-lang & Audio

      const res = await fetch('/api/pipeline/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: articleTitle,
          body: articleBody,
          lang: targetLang,
          site: siteBrand,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setScriptResult(data);
        setActiveStep(5); // Complete
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      const res = await fetch('/api/pipeline/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipelineConfig),
      });
      if (res.ok) {
        setConfigSaveSuccess(true);
        setTimeout(() => setConfigSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const downloadPublishTxt = () => {
    if (!scriptResult) return;
    const content = `TITLE:
${scriptResult.title}

YOUTUBE DESCRIPTION:
${scriptResult.description}

HASHTAGS:
${scriptResult.hashtags.map((h) => `#${h}`).join(' ')}

TIKTOK CAPTION:
${scriptResult.tiktok_caption}

INSTAGRAM CAPTION:
${scriptResult.instagram_caption}

SCENE BREAKDOWN:
${scriptResult.scenes.map((s, idx) => `[Scene ${idx + 1}] (${s.durationEst})\nNarration: ${s.narration}\nVisual Prompt: ${s.visual}\n`).join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publish_${scriptResult.lang}_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Integrated Engine: `free-content-pipeline`
              </span>
              <span className="text-xs text-slate-400 font-medium">Article-to-Video Multi-Language Automation</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              Article-to-Video Automated Pipeline (<code className="text-indigo-300 font-mono text-lg">ttv</code>)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Turns blog articles or WordPress posts into high-engagement videos for <strong>YouTube (16:9)</strong> and <strong>Shorts / TikTok / Reels (9:16)</strong> in <strong>English, French, Spanish, and Arabic (RTL)</strong> using 100% free-tier AI services.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onNavigateToVps}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Hostinger & VPS Deploy Guide
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 text-xs">
          <button
            onClick={() => setSubTab('create')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'create'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Article-to-Video Studio
          </button>

          <button
            onClick={() => setSubTab('config')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'config'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Pipeline Settings (`config.json`)
          </button>

          <button
            onClick={() => setSubTab('doctor')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'doctor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            System Doctor & Health Check
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CREATE / RUN PIPELINE */}
      {subTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Article Input & Settings (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* WordPress Import Card */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  Import from WordPress or Web URL
                </span>
                <button
                  onClick={handleImportSample}
                  className="text-indigo-400 hover:text-indigo-300 text-[11px] underline cursor-pointer"
                >
                  Load Sample Article
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://mysite.com/my-article-post/"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleFetchWpUrl}
                  disabled={isProcessing || !wpUrl}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Fetch
                </button>
              </div>
            </div>

            {/* Article Content Form */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Article Title
                </label>
                <input
                  type="text"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="e.g. 5 Signs Your Dog Truly Loves You"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs text-slate-100 font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Article Body (Text or Markdown)
                </label>
                <textarea
                  rows={6}
                  value={articleBody}
                  onChange={(e) => setArticleBody(e.target.value)}
                  placeholder="Paste article paragraphs here..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Pipeline Configuration Parameters */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Language & Format Matrix
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Language Select */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Target Language</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="en">English (US)</option>
                    <option value="ar">العربية (Arabic - RTL)</option>
                    <option value="fr">Français (French)</option>
                    <option value="es">Español (Spanish)</option>
                  </select>
                </div>

                {/* Video Format Select */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Output Video Format</label>
                  <select
                    value={videoFormat}
                    onChange={(e) => setVideoFormat(e.target.value as 'wide' | 'tall')}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="tall">9:16 Vertical (Shorts, TikTok, Reels)</option>
                    <option value="wide">16:9 Landscape (YouTube)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Brand / Call to Action Website</label>
                <input
                  type="text"
                  value={siteBrand}
                  onChange={(e) => setSiteBrand(e.target.value)}
                  placeholder="e.g. nestpetanimals.com"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Button: Run Pipeline */}
              <button
                onClick={handleRunPipeline}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:brightness-110 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isProcessing ? 'Processing Article-to-Video Pipeline...' : 'Generate Video Script & Assets'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Execution Progress & Output Assets (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Step Progress Tracker */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Pipeline Lifecycle Execution
              </div>

              <div className="space-y-2.5">
                {[
                  { step: 1, label: 'Read & Ingest Article Content', desc: 'Facts extraction & content normalization' },
                  { step: 2, label: 'Write Hook & Scene Script', desc: 'Short spoken sentences with 12-word hook' },
                  { step: 3, label: 'Art Director Visual Prompts', desc: 'Photorealistic image prompts per scene' },
                  { step: 4, label: 'Voice Track & Localization', desc: 'Tone matching for EN, FR, AR, or ES' },
                  { step: 5, label: 'Assets Ready for FFmpeg & Publish', desc: 'Subtitles, captions & metadata package' },
                ].map((item) => {
                  const isDone = activeStep >= item.step;
                  const isCurrent = activeStep === item.step;

                  return (
                    <div
                      key={item.step}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs transition-colors ${
                        isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : isCurrent
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-200 animate-pulse'
                          : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">
                            {item.step}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold block">{item.label}</span>
                        <span className="text-[11px] opacity-75">{item.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generated Script & Assets Viewer */}
            {scriptResult ? (
              <div className="rounded-xl bg-slate-900 border border-emerald-500/30 p-4 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Generated Script ({scriptResult.lang.toUpperCase()})
                    </span>
                    <h4 className="text-sm font-bold text-white">{scriptResult.title}</h4>
                  </div>
                  <button
                    onClick={downloadPublishTxt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download `publish.txt`
                  </button>
                </div>

                {/* Hook Highlight */}
                <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-xs">
                  <span className="font-bold text-indigo-300 block mb-0.5">🎣 Scene 1 Hook (Spoken in First 3 Seconds):</span>
                  <p className="text-white font-medium italic">"{scriptResult.hook}"</p>
                </div>

                {/* Scenes List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {scriptResult.scenes.map((scene, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                        <span>Scene {idx + 1} ({scene.durationEst})</span>
                        <span className="text-indigo-400 font-sans">Photorealistic Visual</span>
                      </div>
                      <p className="text-slate-100 font-medium">"{scene.narration}"</p>
                      <div className="p-2 rounded bg-slate-900 text-[11px] text-slate-400 font-mono leading-relaxed border border-slate-800/80">
                        🎬 Visual Prompt: {scene.visual}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social Captions Accordion */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">Hashtags & Social Captions:</span>
                    <button
                      onClick={() => handleCopy(scriptResult.hashtags.map((h) => `#${h}`).join(' '), 'tags')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'tags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'tags' ? 'Copied' : 'Copy Tags'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {scriptResult.hashtags.map((h, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-[11px] text-indigo-300 border border-slate-800">
                        #{h}
                      </span>
                    ))}
                  </div>
                  <div className="pt-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">TikTok:</span> {scriptResult.tiktok_caption}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-900 border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <span>Run the pipeline to generate your multi-language video script, visual prompts, and social media captions.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CONFIGURATION EDITOR */}
      {subTab === 'config' && pipelineConfig && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                Pipeline Configuration (`free-content-pipeline/config.json`)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit website URL, target languages, video duration, and AI provider order.
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {configSaveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <SaveIcon />}
              {configSaveSuccess ? 'Saved!' : 'Save Config'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">WordPress Site URL</label>
              <input
                type="text"
                value={pipelineConfig.site_url || ''}
                onChange={(e) => setPipelineConfig({ ...pipelineConfig, site_url: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Brand Name / Call to Action</label>
              <input
                type="text"
                value={pipelineConfig.brand || ''}
                onChange={(e) => setPipelineConfig({ ...pipelineConfig, brand: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Max Short Video Duration (Seconds)</label>
              <input
                type="number"
                value={pipelineConfig.short_max_seconds || 58}
                onChange={(e) => setPipelineConfig({ ...pipelineConfig, short_max_seconds: Number(e.target.value) })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Posts Per Automatic Run</label>
              <input
                type="number"
                value={pipelineConfig.posts_per_run || 3}
                onChange={(e) => setPipelineConfig({ ...pipelineConfig, posts_per_run: Number(e.target.value) })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Raw JSON viewer */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Live JSON Representation:</span>
            <pre className="p-4 rounded-xl bg-black border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
              <code>{JSON.stringify(pipelineConfig, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SYSTEM DOCTOR DIAGNOSTICS */}
      {subTab === 'doctor' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Pipeline Health Doctor (`pipeline.py --doctor`)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Diagnostic verification of FFmpeg, Python tools, Arabic fonts, and voice services.
              </p>
            </div>

            <button
              onClick={() => {
                fetch('/api/pipeline/doctor')
                  .then((res) => res.json())
                  .then((d) => setDoctorData(d));
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-scan
            </button>
          </div>

          {doctorData?.checks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Python 3 Environment</span>
                <span className="font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {doctorData.checks.python.version || 'Python 3'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">FFmpeg Video Engine</span>
                <span className="font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {doctorData.checks.ffmpeg.version ? 'Installed & Ready' : 'Installed'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Google Gemini API Key</span>
                <span className="font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {doctorData.checks.geminiKey.value}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Edge-TTS (Free Voices)</span>
                <span className="font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Online Neural Voices Active (Arabic, English, French, Spanish)
                </span>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-2">
            <span className="font-bold text-indigo-300 block">Hostinger VPS Recommendation:</span>
            <p className="text-slate-300 leading-relaxed">
              When deploying on your Hostinger VPS, run <code className="text-white font-mono bg-slate-900 px-1.5 py-0.5 rounded">bash scripts/deploy_hostinger_vps.sh</code> to automatically install all dependencies, configure 24/7 PM2 uptime, setup Nginx reverse proxy, and schedule the nightly video generation cron!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const SaveIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);
