import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Gift, Cpu, ArrowRight, Zap, Play } from 'lucide-react';

interface DirectAnswerBannerProps {
  onExploreApis: () => void;
  onOpenStudio: () => void;
}

export const DirectAnswerBanner: React.FC<DirectAnswerBannerProps> = ({
  onExploreApis,
  onOpenStudio,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 md:p-8 shadow-2xl">
      {/* Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Direct Answer to Your Question
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Google AI Studio & Video APIs
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
          Is there a <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Free API</span> to create Text-to-Video?
        </h2>

        <p className="text-slate-300 text-base md:text-lg max-w-4xl leading-relaxed mb-6">
          <strong className="text-white font-semibold">Short Answer:</strong> Google provides <span className="text-emerald-400 font-medium">100% free API tiers</span> for Gemini text, vision, and reasoning models (<code className="px-1.5 py-0.5 rounded bg-slate-800 text-xs text-indigo-300 font-mono">gemini-3.8-flash</code>). However, native high-compute <strong className="text-white">Video Generation</strong> (<code className="px-1.5 py-0.5 rounded bg-slate-800 text-xs text-purple-300 font-mono">gemini-omni-1.1-flash / Veo</code>) requires a paid Google Cloud project. 
          <span className="block mt-1 text-slate-200">
            <strong>The Great News:</strong> You can still get <span className="text-amber-300 font-semibold underline decoration-amber-400/50">completely free video generation</span> through these 3 proven methods:
          </span>
        </p>

        {/* 3 Clear Paths Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Option 1: Google Cloud $300 Free Credits */}
          <div className="rounded-xl bg-slate-800/80 border border-indigo-500/30 p-4 transition-all hover:border-indigo-400/50 hover:bg-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-indigo-400" /> Method 1
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">$300 Free Credits</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Google Cloud $300 Trial</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              New Google Cloud accounts receive <strong>$300 in free credits</strong> for 90 days. You can use these credits directly to call the <strong>Google Veo (Omni Flash) API</strong> for free video generation.
            </p>
            <div className="text-[11px] text-indigo-300 font-medium flex items-center gap-1">
              <span>Model: <code className="font-mono text-white">gemini-omni-1.1-flash</code></span>
            </div>
          </div>

          {/* Option 2: 100% Free Open-Source Community APIs */}
          <div className="rounded-xl bg-slate-800/80 border border-emerald-500/30 p-4 transition-all hover:border-emerald-400/50 hover:bg-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" /> Method 2
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">100% Free API</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Hugging Face & Pollinations</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Hugging Face provides <strong>free serverless inference</strong> for open video models like <strong>CogVideoX-5B</strong> and <strong>Wan2.1</strong>. Pollinations.ai offers keyless free video generation endpoints.
            </p>
            <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
              <span>Zero credit card required</span>
            </div>
          </div>

          {/* Option 3: Daily Free Credits Platforms */}
          <div className="rounded-xl bg-slate-800/80 border border-purple-500/30 p-4 transition-all hover:border-purple-400/50 hover:bg-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" /> Method 3
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">Daily Free Points</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Kling & Luma Freemium</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              <strong>Kling AI</strong> grants <strong>66 free points every single day</strong> (~6 videos daily). <strong>Luma Dream Machine</strong> gives <strong>30 free generations/month</strong>, and Runway gives 125 free starter credits.
            </p>
            <div className="text-[11px] text-purple-300 font-medium flex items-center gap-1">
              <span>Refreshes every 24 hours</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenStudio}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            Launch Interactive Video Studio
          </button>

          <button
            onClick={onExploreApis}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 active:scale-95 transition-all cursor-pointer"
          >
            Compare All Free Video APIs & Code
            <ArrowRight className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
