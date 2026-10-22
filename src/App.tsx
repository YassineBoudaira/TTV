import React, { useState } from 'react';
import { Header } from './components/Header';
import { DirectAnswerBanner } from './components/DirectAnswerBanner';
import { VideoStudio } from './components/VideoStudio';
import { ApiDirectory } from './components/ApiDirectory';
import { PromptGuide } from './components/PromptGuide';
import { CostCalculator } from './components/CostCalculator';
import { AutoPipeline } from './components/AutoPipeline';
import { VpsDeployGuide } from './components/VpsDeployGuide';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { Sparkles, Terminal, CheckCircle2, Film, ArrowRight, BookOpen, Server, Zap } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'answer' | 'studio' | 'directory' | 'guide' | 'calculator' | 'pipeline' | 'vps' | 'performance'>('answer');

  const handleApplyPromptToStudio = (prompt: string, style: string, camera: string) => {
    setActiveTab('studio');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Header activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Main Content Router */}
        {activeTab === 'answer' && (
          <div className="space-y-8">
            <DirectAnswerBanner
              onExploreApis={() => setActiveTab('directory')}
              onOpenStudio={() => setActiveTab('studio')}
            />

            {/* Pipeline Teaser Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 shadow-lg">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Integrated Feature
                  </span>
                  <span className="text-xs text-white font-bold">Article-to-Video Multi-Language Pipeline</span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Turn articles into automated YouTube Shorts, TikToks, and Reels in English, French, Spanish, and Arabic with voiceovers, subtitles, and photographic AI prompts.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('pipeline')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  Open Auto Pipeline <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveTab('vps')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                  Hostinger & VPS Guide
                </button>
              </div>
            </div>

            {/* Performance & Acceleration Teaser Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 shadow-lg">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    High-Level Performance Architecture
                  </span>
                  <span className="text-xs text-white font-bold">Gzip Compression • In-Memory TTL Cache • 60 FPS Canvas</span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Inspect real-time Node RSS memory, sub-millisecond API caching, multi-threaded FFmpeg flags, and Linux swap partition optimization for Hostinger and VPS.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('performance')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Performance & Health Monitor <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Interactive Preview of the Studio right on the home page */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Film className="w-5 h-5 text-indigo-400" />
                    Try Text-to-Video Now
                  </h3>
                  <p className="text-xs text-slate-400">
                    Test the AI Director prompt enhancer and canvas motion simulation
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('studio')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  Full Studio Mode <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <VideoStudio onExploreApis={() => setActiveTab('directory')} />
            </div>

            {/* Key Comparison Matrix Teaser */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Top Free & Freemium Video APIs At-a-Glance</h3>
                <button
                  onClick={() => setActiveTab('directory')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  View All Code Snippets <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <ApiDirectory />
            </div>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <AutoPipeline onNavigateToVps={() => setActiveTab('vps')} />
        )}

        {activeTab === 'studio' && (
          <VideoStudio onExploreApis={() => setActiveTab('directory')} />
        )}

        {activeTab === 'performance' && (
          <PerformanceDashboard />
        )}

        {activeTab === 'directory' && (
          <ApiDirectory />
        )}

        {activeTab === 'guide' && (
          <PromptGuide onApplyPrompt={handleApplyPromptToStudio} />
        )}

        {activeTab === 'calculator' && (
          <CostCalculator />
        )}

        {activeTab === 'vps' && (
          <VpsDeployGuide />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Veo & AI Video Studio</span>
            <span>•</span>
            <span>Text-to-Video Engine & Hostinger VPS Ready</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveTab('answer')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Direct Answer
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className="hover:text-emerald-400 transition-colors cursor-pointer text-emerald-400"
            >
              Auto Pipeline (`ttv`)
            </button>
            <button
              onClick={() => setActiveTab('studio')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Video Studio
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className="hover:text-amber-400 transition-colors cursor-pointer text-amber-400"
            >
              Performance & Health
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              API Directory
            </button>
            <button
              onClick={() => setActiveTab('vps')}
              className="hover:text-blue-400 transition-colors cursor-pointer text-blue-400"
            >
              Hostinger / VPS Deploy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
