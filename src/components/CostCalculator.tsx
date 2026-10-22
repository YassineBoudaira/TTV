import React, { useState } from 'react';
import { Calculator, DollarSign, Gift, Zap, Sparkles, TrendingUp } from 'lucide-react';

export const CostCalculator: React.FC = () => {
  const [videoCount, setVideoCount] = useState<number>(20);
  const [avgDuration, setAvgDuration] = useState<number>(5); // 5 seconds

  const totalSeconds = videoCount * avgDuration;

  // Cost estimates
  const veoCostPerSec = 0.08; // ~$0.08/sec
  const replicateCostPerSec = 0.0014; // A40 GPU
  const runwayCostPerSec = 0.05; // 5 credits/sec

  const veoTotal = (totalSeconds * veoCostPerSec).toFixed(2);
  const replicateTotal = (totalSeconds * replicateCostPerSec).toFixed(2);
  const runwayTotal = (totalSeconds * runwayCostPerSec).toFixed(2);

  // How many videos can you get with Google Cloud $300 free trial?
  const freeGcpVideos = Math.floor(300 / (avgDuration * veoCostPerSec));
  // How many free videos per month with Kling (66 pts/day = ~6 videos/day * 30)?
  const freeKlingVideos = 6 * 30;
  // How many free videos per month with Luma?
  const freeLumaVideos = 30;

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
          <Calculator className="w-4 h-4 text-indigo-400" />
          Text-to-Video API Cost & Free Credit Estimator
        </h3>
        <p className="text-xs text-slate-400">
          Calculate project costs across top AI video APIs and see exactly how far free trial credits and daily quotas will take you.
        </p>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-300">
            <span>Number of Videos Needed:</span>
            <span className="text-indigo-400 font-mono">{videoCount} videos</span>
          </div>
          <input
            type="range"
            min={1}
            max={200}
            value={videoCount}
            onChange={(e) => setVideoCount(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>1 video</span>
            <span>100 videos</span>
            <span>200 videos</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-300">
            <span>Clip Duration per Video:</span>
            <span className="text-indigo-400 font-mono">{avgDuration} seconds</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[5, 10].map((sec) => (
              <button
                key={sec}
                onClick={() => setAvgDuration(sec)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  avgDuration === sec
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec} Seconds Clip
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-400 text-right">
            Total Footage: <strong className="text-slate-200">{totalSeconds} seconds</strong>
          </div>
        </div>
      </div>

      {/* Free Tier Capacity Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Google Cloud Trial</span>
            <Gift className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mb-1">
            ~{freeGcpVideos} Free Videos
          </div>
          <p className="text-xs text-slate-300">
            With your $300 new-user credit, you can generate approx <strong className="text-white">{freeGcpVideos}</strong> {avgDuration}s clips using Google Veo.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Kling AI Daily</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mb-1">
            ~{freeKlingVideos} Free / Month
          </div>
          <p className="text-xs text-slate-300">
            66 free points every single day allows producing approximately ~6 free videos daily without entering payment info.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Hugging Face Serverless</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mb-1">
            Unlimited Free*
          </div>
          <p className="text-xs text-slate-300">
            Community serverless inference for CogVideoX and Wan2.1 is free to call with standard shared rate limits.
          </p>
        </div>
      </div>

      {/* Cost Comparison Table for Target Video Count */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden text-xs">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 font-bold text-slate-200">
          Estimated Cost to Produce {videoCount} Videos ({totalSeconds}s total)
        </div>
        <div className="divide-y divide-slate-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Google Veo (Gemini Omni Flash)</span>
              <span className="text-slate-400 text-[11px]">Pay-as-you-go GPU inference</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-emerald-400 text-sm">${veoTotal}</span>
              <span className="text-[10px] text-slate-400 block">or $0 if using $300 trial</span>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Runway Gen-3 Alpha</span>
              <span className="text-slate-400 text-[11px]">5 credits per second</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-white text-sm">${runwayTotal}</span>
              <span className="text-[10px] text-slate-400 block">~$0.05 / sec</span>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Replicate (Open-Sora / CogVideoX on A40)</span>
              <span className="text-slate-400 text-[11px]">Per-second GPU time</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-emerald-400 text-sm">${replicateTotal}</span>
              <span className="text-[10px] text-slate-400 block">Lowest raw cloud cost</span>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Hugging Face Community Inference</span>
              <span className="text-slate-400 text-[11px]">Free community GPU queues</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-emerald-400 text-sm">$0.00</span>
              <span className="text-[10px] text-emerald-400 block">100% Free</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
