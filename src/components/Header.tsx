import React from 'react';
import { Film, Sparkles, Layers, Terminal, Calculator, Play, BookOpen, Zap } from 'lucide-react';

interface HeaderProps {
  activeTab: 'answer' | 'studio' | 'directory' | 'guide' | 'calculator' | 'pipeline' | 'vps' | 'performance';
  onSelectTab: (tab: 'answer' | 'studio' | 'directory' | 'guide' | 'calculator' | 'pipeline' | 'vps' | 'performance') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => onSelectTab('answer')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight group-hover:text-indigo-300 transition-colors">
                  Veo & AI Video Studio
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  API Hub
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block -mt-0.5">
                Text-to-Video Free Tiers & Automated Pipeline
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onSelectTab('answer')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'answer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Direct Answer
            </button>

            <button
              onClick={() => onSelectTab('pipeline')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pipeline'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Auto Pipeline (`ttv`)
            </button>

            <button
              onClick={() => onSelectTab('studio')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'studio'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Studio
            </button>

            <button
              onClick={() => onSelectTab('directory')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'directory'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Free APIs
            </button>

            <button
              onClick={() => onSelectTab('performance')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'performance'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Performance & Health
            </button>

            <button
              onClick={() => onSelectTab('vps')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'vps'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-400 hover:text-blue-300 hover:bg-slate-800'
              }`}
            >
              Hostinger & VPS
            </button>
          </nav>

          {/* Quick Performance & Trial Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('performance')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors cursor-pointer"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Speed: 60 FPS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-slate-800 bg-slate-950 px-2 py-2 text-[11px] overflow-x-auto">
        <button
          onClick={() => onSelectTab('answer')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'answer' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          Answer
        </button>
        <button
          onClick={() => onSelectTab('pipeline')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'pipeline' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          Pipeline
        </button>
        <button
          onClick={() => onSelectTab('studio')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'studio' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          Studio
        </button>
        <button
          onClick={() => onSelectTab('directory')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'directory' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          APIs
        </button>
        <button
          onClick={() => onSelectTab('guide')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'guide' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          Prompts
        </button>
        <button
          onClick={() => onSelectTab('performance')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'performance' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
        >
          Speed & Health
        </button>
        <button
          onClick={() => onSelectTab('vps')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'vps' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
        >
          Hostinger/VPS
        </button>
      </div>
    </header>
  );
};
