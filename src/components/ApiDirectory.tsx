import React, { useState } from 'react';
import { Search, ExternalLink, Check, Copy, Code2, Zap, Gift, ShieldAlert, Sparkles, Terminal } from 'lucide-react';
import { VIDEO_APIS } from '../data/videoApis';
import { VideoApiInfo } from '../types';

export const ApiDirectory: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<Record<string, 'curl' | 'python' | 'node'>>({});

  const filteredApis = VIDEO_APIS.filter((api) => {
    const matchesSearch =
      api.name.toLowerCase().includes(search.toLowerCase()) ||
      api.company.toLowerCase().includes(search.toLowerCase()) ||
      api.modelId.toLowerCase().includes(search.toLowerCase()) ||
      api.freeTierStatus.toLowerCase().includes(search.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'free') return matchesSearch && api.badgeType === 'free';
    if (filterType === 'trial') return matchesSearch && (api.badgeType === 'trial' || api.badgeType === 'freemium');
    return matchesSearch;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBadgeClass = (badge: VideoApiInfo['badgeType']) => {
    switch (badge) {
      case 'free':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'trial':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'freemium':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Directory Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            Text-to-Video APIs: Free Tier & Pricing Directory
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            A comprehensive, verified comparison of free tiers, trial credits, and developer endpoints for generating AI video from text.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search APIs or models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 w-48 sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({VIDEO_APIS.length})
            </button>
            <button
              onClick={() => setFilterType('free')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterType === 'free' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              100% Free
            </button>
            <button
              onClick={() => setFilterType('trial')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterType === 'trial' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trial / Free Points
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Video APIs */}
      <div className="space-y-4">
        {filteredApis.map((api) => {
          const codeTab = activeCodeTab[api.id] || 'curl';
          const codeToDisplay =
            codeTab === 'python' && api.pythonSnippet
              ? api.pythonSnippet
              : codeTab === 'node' && api.nodeSnippet
              ? api.nodeSnippet
              : api.curlSnippet;

          return (
            <div
              key={api.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all p-5 shadow-lg space-y-4"
            >
              {/* API Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h4 className="text-base font-bold text-white">{api.name}</h4>
                    <span className="text-xs text-slate-400 font-medium">by {api.company}</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClass(
                        api.badgeType
                      )}`}
                    >
                      {api.freeTierStatus}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>Model: <code className="text-indigo-300">{api.modelId}</code></span>
                    <span>•</span>
                    <span>Resolution: <span className="text-slate-300">{api.resolution}</span></span>
                    <span>•</span>
                    <span>Max Duration: <span className="text-slate-300">{api.maxDuration}</span></span>
                  </div>
                </div>

                <a
                  href={api.webUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  Official Docs & Portal
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>

              {/* Instructions on how to get free access */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <Gift className="w-3.5 h-3.5" />
                  How to Access for Free:
                </div>
                <p className="text-slate-300 leading-relaxed">{api.freeAccessInstructions}</p>
              </div>

              {/* Key Features Pill row */}
              <div className="flex flex-wrap items-center gap-1.5">
                {api.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700/50"
                  >
                    ✓ {feat}
                  </span>
                ))}
              </div>

              {/* Code Snippet Box */}
              <div className="rounded-xl bg-black border border-slate-800 overflow-hidden text-xs">
                <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold text-slate-300 text-[11px]">API Call Example</span>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => setActiveCodeTab({ ...activeCodeTab, [api.id]: 'curl' })}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          codeTab === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        cURL
                      </button>
                      {api.pythonSnippet && (
                        <button
                          onClick={() => setActiveCodeTab({ ...activeCodeTab, [api.id]: 'python' })}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            codeTab === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Python
                        </button>
                      )}
                      {api.nodeSnippet && (
                        <button
                          onClick={() => setActiveCodeTab({ ...activeCodeTab, [api.id]: 'node' })}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            codeTab === 'node' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Node.js
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(codeToDisplay, api.id)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
                  >
                    {copiedId === api.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedId === api.id ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <pre className="p-3.5 overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed">
                  <code>{codeToDisplay}</code>
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
