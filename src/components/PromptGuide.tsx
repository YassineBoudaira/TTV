import React, { useState } from 'react';
import { Sparkles, Film, Camera, Sun, Compass, Play, Copy, Check, ArrowRight } from 'lucide-react';

interface PromptGuideProps {
  onApplyPrompt: (prompt: string, style: string, camera: string) => void;
}

export const PromptGuide: React.FC<PromptGuideProps> = ({ onApplyPrompt }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('a solitary neon cyberpunk cyclist');
  const [selectedAction, setSelectedAction] = useState<string>('speeding through rain puddles with water spray droplets catching streetlights');
  const [selectedCamera, setSelectedCamera] = useState<string>('low-angle tracking shot pushing forward alongside the subject');
  const [selectedLighting, setSelectedLighting] = useState<string>('vibrant magenta and cyan neon reflections on wet asphalt with atmospheric mist');
  const [selectedStyle, setSelectedStyle] = useState<string>('Cinematic 8K, 35mm anamorphic lens, shallow depth of field, photorealistic motion blur');
  const [copied, setCopied] = useState<boolean>(false);

  const assembledPrompt = `${selectedSubject}, ${selectedAction}. Camera executes a ${selectedCamera}. Lighting is ${selectedLighting}. Visual aesthetic: ${selectedStyle}.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(assembledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToStudio = () => {
    onApplyPrompt(assembledPrompt, 'Cinematic Film', 'Tracking Shot');
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
          <Film className="w-4 h-4 text-indigo-400" />
          Text-to-Video Prompt Architecture & Formula
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          Unlike static image generation, video models (like Google Veo, CogVideoX, and Gen-3) require temporal directives: instructions on how subjects move through 3D space, camera focal paths, and how light changes across time.
        </p>
      </div>

      {/* Formula Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Subject */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> 1. Subject & Detail
          </div>
          <div className="space-y-1.5">
            {[
              'a solitary neon cyberpunk cyclist',
              'a majestic silver-back gorilla sitting by a waterfall',
              'a hyper-detailed mechanical hummingbird with crystal wings',
              'an ancient explorer lighting a torch inside an ice cavern',
            ].map((sub, i) => (
              <button
                key={i}
                onClick={() => setSelectedSubject(sub)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-all cursor-pointer ${
                  selectedSubject === sub
                    ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Pillar 2: Action & Physics */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" /> 2. Motion & Physics
          </div>
          <div className="space-y-1.5">
            {[
              'speeding through rain puddles with water spray droplets catching streetlights',
              'gently lifting hand as floating cherry petals swirl around fingers',
              'hovering mid-air while transparent clockwork gears revolve smoothly',
              'slowly looking up in wonder as crystalline aurora shines above',
            ].map((act, i) => (
              <button
                key={i}
                onClick={() => setSelectedAction(act)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-all cursor-pointer ${
                  selectedAction === act
                    ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* Pillar 3: Camera Movement */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5" /> 3. Camera Trajectory
          </div>
          <div className="space-y-1.5">
            {[
              'low-angle tracking shot pushing forward alongside the subject',
              '360-degree rotational orbit maintaining subject dead center',
              'high-altitude aerial drone dive transitioning into an eye-level glide',
              'extreme macro focus pull from foreground droplet to subject background',
            ].map((cam, i) => (
              <button
                key={i}
                onClick={() => setSelectedCamera(cam)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-all cursor-pointer ${
                  selectedCamera === cam
                    ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cam}
              </button>
            ))}
          </div>
        </div>

        {/* Pillar 4: Lighting & Mood */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sun className="w-3.5 h-3.5" /> 4. Lighting & Color
          </div>
          <div className="space-y-1.5">
            {[
              'vibrant magenta and cyan neon reflections on wet asphalt with atmospheric mist',
              'warm golden hour god rays filtering through forest canopy with dust motes',
              'high-contrast dramatic rim lighting with deep cinematic shadows',
              'bioluminescent underwater glow with iridescent caustic light patterns',
            ].map((light, i) => (
              <button
                key={i}
                onClick={() => setSelectedLighting(light)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-all cursor-pointer ${
                  selectedLighting === light
                    ? 'bg-amber-600/30 text-amber-200 border border-amber-500/50'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {light}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assembled Output Box */}
      <div className="rounded-2xl bg-slate-900 border border-indigo-500/30 p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Assembled Production Prompt
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Prompt'}
            </button>
            <button
              onClick={handleSendToStudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors cursor-pointer"
            >
              Load into Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 leading-relaxed">
          {assembledPrompt}
        </div>
      </div>
    </div>
  );
};
