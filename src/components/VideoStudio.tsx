import React, { useState } from 'react';
import { Sparkles, Wand2, Video, Film, Sliders, Layers, Play, AlertCircle, Info, ExternalLink, Check, Copy } from 'lucide-react';
import { GenerationConfig, DirectorEnhancement } from '../types';
import { PROMPT_PRESETS } from '../data/videoApis';
import { CinematicPlayer } from './CinematicPlayer';

import { AudioTranscribe } from './AudioTranscribe';
import { LiveVoiceConversation } from './LiveVoiceConversation';
import { Upload, Image as ImageIcon, Mic, MessageSquare } from 'lucide-react';

interface VideoStudioProps {
  onShowPaidModelFlow?: () => void;
  onExploreApis: () => void;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ onShowPaidModelFlow, onExploreApis }) => {
  const [studioMode, setStudioMode] = useState<'text' | 'image'>('text');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLiveOpen, setIsLiveOpen] = useState<boolean>(false);
  const [isAnimatingImage, setIsAnimatingImage] = useState<boolean>(false);

  const [config, setConfig] = useState<GenerationConfig>({
    prompt: 'A futuristic cybernetic tiger prowling through a misty bamboo grove with glowing bioluminescent stripes, 8k cinematic lighting',
    aspectRatio: '16:9',
    duration: '5s',
    resolution: '720p',
    style: 'Cinematic Film',
    cameraMovement: 'Smooth Dolly In',
    lighting: 'Volumetric Haze',
    fps: 24,
  });

  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isGeneratingVeo, setIsGeneratingVeo] = useState<boolean>(false);
  const [enhancement, setEnhancement] = useState<DirectorEnhancement | null>(null);
  const [realVideoUrl, setRealVideoUrl] = useState<string | null>(null);
  const [veoErrorModal, setVeoErrorModal] = useState<{ show: boolean; message: string; isBilling: boolean } | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Handle Photo upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Animate Photo into Video using gemini-omni-1.1-flash
  const handleAnimatePhoto = async () => {
    if (!uploadedImage) return;
    try {
      setIsAnimatingImage(true);
      setRealVideoUrl(null);

      const res = await fetch('/api/animate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: uploadedImage,
          prompt: config.prompt || 'Animate this photo with natural, cinematic motion and lighting changes.',
          aspectRatio: config.aspectRatio,
          duration: config.duration,
        }),
      });

      const data = await res.json();
      if (data.success && (data.videoData || data.videoUri)) {
        setRealVideoUrl(data.videoData || data.videoUri);
      } else {
        setVeoErrorModal({
          show: true,
          message: data.error || 'Photo animation requires gemini-omni-1.1-flash paid tier.',
          isBilling: !!data.isPaidModelRequired,
        });
      }
    } catch (err: any) {
      setVeoErrorModal({
        show: true,
        message: err.message || 'Error animating photo.',
        isBilling: true,
      });
    } finally {
      setIsAnimatingImage(false);
    }
  };

  // Quick preset loader
  const handleSelectPreset = (preset: typeof PROMPT_PRESETS[0]) => {
    setConfig((prev) => ({
      ...prev,
      prompt: preset.prompt,
      style: preset.style,
      cameraMovement: preset.camera,
      duration: preset.duration,
    }));
  };

  // AI Prompt Enhancer calling backend /api/enhance-prompt
  const handleEnhancePrompt = async () => {
    if (!config.prompt.trim()) return;
    try {
      setIsEnhancing(true);
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: config.prompt,
          style: config.style,
          camera: config.cameraMovement,
          duration: config.duration,
        }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setEnhancement(data);
        setConfig((prev) => ({
          ...prev,
          prompt: data.enhancedPrompt,
        }));
      }
    } catch (err) {
      console.error('Enhance prompt failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Call Google Veo API (gemini-omni-1.1-flash)
  const handleGenerateVeo = async () => {
    if (!config.prompt.trim()) return;
    try {
      setIsGeneratingVeo(true);
      setRealVideoUrl(null);

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: config.prompt,
          aspectRatio: config.aspectRatio,
          duration: config.duration,
          resolution: config.resolution,
        }),
      });

      const data = await res.json();

      if (data.success && (data.videoData || data.videoUri)) {
        setRealVideoUrl(data.videoData || data.videoUri);
      } else {
        setVeoErrorModal({
          show: true,
          message: data.error || 'Google Veo (gemini-omni-1.1-flash) requires a paid tier or billing account.',
          isBilling: !!data.isPaidModelRequired,
        });
      }
    } catch (err: any) {
      setVeoErrorModal({
        show: true,
        message: err.message || 'Free Tier has 0 requests/day for video generation.',
        isBilling: true,
      });
    } finally {
      setIsGeneratingVeo(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(config.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Studio features */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />
            AI Video Director Studio
          </h3>
          <p className="text-xs text-slate-400">
            Create video from text, animate photos into video, transcribe audio prompts, or talk in real-time with Gemini Live.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setStudioMode('text')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'text'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Text to Video
            </button>
            <button
              onClick={() => setStudioMode('image')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'image'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Animate Photo
            </button>
          </div>

          {/* Gemini 3.8 Live Voice Conversation Trigger */}
          <button
            onClick={() => setIsLiveOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            Talk Live (Gemini 3.8)
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Controls & Prompt, Right Cinematic Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompting & Controls (6 Cols) */}
        <div className="lg:col-span-6 space-y-5">
          {studioMode === 'text' ? (
            <>
              {/* Presets Row */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Instant Inspiration Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROMPT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className="text-left p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 transition-all text-xs group cursor-pointer"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-indigo-300 block truncate">
                    {preset.title}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {preset.style} • {preset.camera}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                Text-to-Video Description Prompt
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyPrompt}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedPrompt ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={config.prompt}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                rows={4}
                placeholder="Describe your scene in detail: subject, action, camera movement, lighting, atmosphere..."
                className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 resize-none transition-all outline-none"
              />

              {/* Enhance with AI Director button */}
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className="absolute right-3 bottom-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : 'text-indigo-200'}`} />
                {isEnhancing ? 'Enhancing Shot...' : 'AI Director Enhance'}
              </button>
            </div>

            {/* Voice Dictation via gemini-3.5-transcribe */}
            <div className="pt-1">
              <AudioTranscribe
                onTranscribed={(text) => {
                  setConfig((prev) => ({
                    ...prev,
                    prompt: prev.prompt ? `${prev.prompt} ${text}` : text,
                  }));
                }}
              />
            </div>
          </div>

          {/* Camera & Cinematography Settings */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Cinematography & Format Settings
            </div>

            {/* Aspect Ratio & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setConfig({ ...config, aspectRatio: ratio })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        config.aspectRatio === ratio
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Shot Duration</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['5s', '10s'] as const).map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setConfig({ ...config, duration: dur })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        config.duration === dur
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                      }`}
                    >
                      {dur} Shot
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Camera Motion */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Camera Trajectory</label>
              <select
                value={config.cameraMovement}
                onChange={(e) => setConfig({ ...config, cameraMovement: e.target.value })}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 p-2 outline-none focus:border-indigo-500"
              >
                <option value="Smooth Dolly In">Smooth Dolly In (Forward Push)</option>
                <option value="Orbit 360">Orbit 360 (Rotational Sweep)</option>
                <option value="Drone Aerial">Drone Aerial (High-Altitude Flyover)</option>
                <option value="Tracking Shot">Tracking Shot (Horizontal Follow)</option>
                <option value="Macro Zoom">Macro Zoom (Extreme Close-Up)</option>
                <option value="Static Pan">Static Pan (Subtle Panoramic)</option>
              </select>
            </div>

            {/* Style & Lighting */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Visual Aesthetic</label>
                <select
                  value={config.style}
                  onChange={(e) => setConfig({ ...config, style: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 p-2 outline-none focus:border-indigo-500"
                >
                  <option value="Cinematic Film">Cinematic Film (35mm Anamorphic)</option>
                  <option value="Hyper-Realistic 8K">Hyper-Realistic 8K</option>
                  <option value="Cyberpunk Neon">Cyberpunk Neon Noir</option>
                  <option value="Anime / Studio Ghibli">Anime / Studio Ghibli</option>
                  <option value="Vintage 16mm">Vintage 16mm Film Grain</option>
                  <option value="3D Unreal Engine 5">3D Unreal Engine 5</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Atmospheric Lighting</label>
                <select
                  value={config.lighting}
                  onChange={(e) => setConfig({ ...config, lighting: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 p-2 outline-none focus:border-indigo-500"
                >
                  <option value="Volumetric Haze">Volumetric Fog & Light Beams</option>
                  <option value="Golden Hour Sunset">Golden Hour Warm Glow</option>
                  <option value="Neon Noir">Neon High Contrast</option>
                  <option value="Studio Softbox">Clean Studio Softbox</option>
                  <option value="Dramatic Rim Light">Dramatic Edge Rim Lighting</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons: Generate Video */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button 1: Live Motion Synthesizer (Instant & Free) */}
              <button
                onClick={() => {
                  setRealVideoUrl(null);
                }}
                className="p-3.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>Simulate Camera Motion (Free)</span>
              </button>

              {/* Button 2: Call Google Veo API */}
              <button
                onClick={handleGenerateVeo}
                disabled={isGeneratingVeo}
                className="p-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                <Video className="w-4 h-4" />
                <span>{isGeneratingVeo ? 'Calling Veo API...' : 'Call Google Veo (Omni Flash)'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              💡 Uses Google Veo via <code className="text-indigo-300 font-mono">gemini-omni-1.1-flash</code> (aspect ratio 16:9 & 9:16).
            </p>
          </div>
        </>
      ) : (
        /* Animate Photo into Video Mode */
        <div className="space-y-5">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              Upload Photo to Animate
            </label>

            {uploadedImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2">
                <img
                  src={uploadedImage}
                  alt="Uploaded preview"
                  className="w-full h-48 object-contain rounded-lg bg-black/40"
                />
                <button
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-900/80 text-slate-200 hover:text-white border border-slate-700 transition-colors text-xs cursor-pointer"
                >
                  Replace Photo
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all text-center">
                <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                <span className="text-sm font-semibold text-slate-200">Click to upload photo or portrait</span>
                <span className="text-xs text-slate-400 mt-1">Supports PNG, JPG, WebP up to 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Motion Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Motion & Animation Direction
            </label>
            <textarea
              value={config.prompt}
              onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
              rows={3}
              placeholder="Describe how the photo should animate: e.g. subtle breathing, wind blowing through hair, camera slowly zooming into the eyes, leaves rustling..."
              className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 resize-none outline-none"
            />

            {/* Voice Dictation */}
            <div className="pt-1">
              <AudioTranscribe
                onTranscribed={(text) => {
                  setConfig((prev) => ({
                    ...prev,
                    prompt: prev.prompt ? `${prev.prompt} ${text}` : text,
                  }));
                }}
              />
            </div>
          </div>

          {/* Aspect Ratio Options */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Output Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {(['16:9', '9:16'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setConfig({ ...config, aspectRatio: ratio })}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      config.aspectRatio === ratio
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                    }`}
                  >
                    {ratio === '16:9' ? '16:9 Landscape' : '9:16 Vertical'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Duration</label>
              <div className="grid grid-cols-2 gap-2">
                {(['5s', '10s'] as const).map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setConfig({ ...config, duration: dur })}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      config.duration === dur
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button: Animate Image */}
          <button
            onClick={handleAnimatePhoto}
            disabled={!uploadedImage || isAnimatingImage}
            className="w-full p-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video className="w-4 h-4" />
            <span>
              {isAnimatingImage ? 'Animating Photo into Video...' : 'Animate Photo into Video (gemini-omni-1.1-flash)'}
            </span>
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            💡 Uses Interactions API with <code className="text-indigo-300 font-mono">gemini-omni-1.1-flash</code> supporting 16:9 and 9:16 aspect ratios.
          </p>
        </div>
      )}
    </div>

    {/* Right Column: Cinematic Canvas & Video Player (6 Cols) */}
    <div className="lg:col-span-6">
      <CinematicPlayer
        realVideoUrl={realVideoUrl}
        config={config}
        enhancement={enhancement}
        isGenerating={isGeneratingVeo || isAnimatingImage}
      />
    </div>
  </div>

      {/* Veo API Status Modal / Notice */}
      {veoErrorModal && veoErrorModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Google Veo API Access Notice</h4>
                <p className="text-xs text-slate-400">Gemini Video Generation Model: gemini-omni-1.1-flash</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {veoErrorModal.isBilling ? (
                <>
                  <strong className="text-white">Why did this happen?</strong> Google's Video Generation model (<code className="text-indigo-300 font-mono">gemini-omni-1.1-flash</code> / Veo) requires a Google Cloud billing account or paid API key because video synthesis demands dedicated GPU clusters.
                  <span className="block mt-2">
                    <strong>How to get it for free:</strong> If you create a new Google Cloud account, Google provides <span className="text-emerald-400 font-semibold">$300 in free trial credits</span> that can be applied to this exact API!
                  </span>
                </>
              ) : (
                veoErrorModal.message
              )}
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 mb-5">
              <div className="font-semibold text-slate-200">What you can do right now:</div>
              <ul className="list-disc list-inside text-slate-400 space-y-1.5 text-[11px]">
                <li><strong className="text-white">Option 1 (Instant):</strong> Use our built-in <strong>Cinematic Motion Synthesizer</strong> to preview camera movement, lighting, and export WebM for free.</li>
                <li><strong className="text-white">Option 2 ($300 Credit):</strong> Enable Google Cloud billing to get <span className="text-emerald-400 font-semibold">$300 free trial credits</span> for Veo.</li>
                <li><strong className="text-white">Option 3 (100% Free API):</strong> Use Hugging Face CogVideoX or Pollinations.ai without a credit card.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setVeoErrorModal(null);
                  setRealVideoUrl(null); // Triggers the free procedural motion player
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Launch Free Motion Synthesizer
              </button>

              <button
                onClick={() => {
                  setVeoErrorModal(null);
                  onExploreApis();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                View Free Open-Source APIs
              </button>

              <a
                href="https://ai.dev/rate-limit"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1 transition-colors"
              >
                Upgrade Tier <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Live Voice Conversation Modal (gemini-3.8-live) */}
      <LiveVoiceConversation
        isOpen={isLiveOpen}
        onClose={() => setIsLiveOpen(false)}
      />
    </div>
  );
};
