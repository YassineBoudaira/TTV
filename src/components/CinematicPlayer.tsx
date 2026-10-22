import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Download, Maximize2, Sparkles, Video, Film, Eye, Volume2, VolumeX } from 'lucide-react';
import { GenerationConfig, DirectorEnhancement } from '../types';

interface CinematicPlayerProps {
  realVideoUrl: string | null;
  config: GenerationConfig;
  enhancement: DirectorEnhancement | null;
  isGenerating: boolean;
}

export const CinematicPlayer: React.FC<CinematicPlayerProps> = ({
  realVideoUrl,
  config,
  enhancement,
  isGenerating,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  const durationSec = config.duration === '10s' ? 10 : 5;
  const animationFrameId = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const pausedTimeRef = useRef<number>(0);

  // Audio synthesizer for atmospheric cinema hum
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (audioContextRef.current || isSoundMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, ctx.currentTime); // Low cinematic A1 drone
      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      audioContextRef.current = ctx;
      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn('AudioContext not allowed without user interaction');
    }
  };

  const toggleSound = () => {
    if (isSoundMuted) {
      setIsSoundMuted(false);
      if (gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0.04, audioContextRef.current.currentTime);
      } else {
        initAudio();
      }
    } else {
      setIsSoundMuted(true);
      if (gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      }
    }
  };

  // Canvas motion renderer
  useEffect(() => {
    if (realVideoUrl) return; // If real video is loaded, we don't need canvas simulation

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on aspect ratio
    const width = 854;
    let height = 480;
    if (config.aspectRatio === '9:16') {
      height = (width * 16) / 9;
    } else if (config.aspectRatio === '1:1') {
      height = width;
    }
    canvas.width = width;
    canvas.height = height;

    // Generate random particle stars / dust motes
    const particles: Array<{ x: number; y: number; z: number; size: number; speed: number; hue: number }> = [];
    for (let i = 0; i < 160; i++) {
      particles.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * 800 + 100,
        size: Math.random() * 2.5 + 1,
        speed: Math.random() * 2 + 1,
        hue: Math.random() * 60 + (config.style === 'Cyberpunk' ? 280 : 30),
      });
    }

    // Pre-create and cache static gradients to avoid GC allocations during 60FPS loop
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    const isCyber = config.style.includes('Cyberpunk');
    const isAnime = config.style.includes('Anime');
    const isSciFi = config.style.includes('Sci-Fi');

    if (isCyber) {
      bgGrad.addColorStop(0, '#09081a');
      bgGrad.addColorStop(0.5, '#170c29');
      bgGrad.addColorStop(1, '#02000d');
    } else if (isAnime) {
      bgGrad.addColorStop(0, '#1a365d');
      bgGrad.addColorStop(0.4, '#4299e1');
      bgGrad.addColorStop(0.8, '#f687b3');
      bgGrad.addColorStop(1, '#fbb6ce');
    } else if (isSciFi) {
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#1e1b4b');
    } else {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#020617');
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const vignetteGrad = ctx.createRadialGradient(centerX, centerY, width * 0.25, centerX, centerY, width * 0.65);
    vignetteGrad.addColorStop(0, 'transparent');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

    let lastRenderTime = performance.now();

    const render = (now: number) => {
      if (document.hidden) return; // Do not render if tab is hidden
      
      const elapsed = ((now - startTimeRef.current) / 1000) % durationSec;
      setCurrentTime(elapsed);
      const progress = elapsed / durationSec; // 0.0 to 1.0

      // 1. Draw atmospheric background gradient (pre-cached)
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Camera transformation based on selected camera movement
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;

      let cameraX = centerX;
      let cameraY = centerY;
      let cameraZoom = 1;
      let cameraRotation = 0;

      if (config.cameraMovement.includes('Dolly') || config.cameraMovement.includes('Zoom')) {
        cameraZoom = 1 + progress * 0.35; // Smooth cinematic push-in
      } else if (config.cameraMovement.includes('Orbit')) {
        cameraRotation = Math.sin(progress * Math.PI * 2) * 0.08;
        cameraX = centerX + Math.cos(progress * Math.PI * 2) * 30;
      } else if (config.cameraMovement.includes('Drone') || config.cameraMovement.includes('Aerial')) {
        cameraY = centerY + (progress - 0.5) * 50;
        cameraZoom = 1.1 - progress * 0.15;
      } else if (config.cameraMovement.includes('Tracking') || config.cameraMovement.includes('Pan')) {
        cameraX = centerX + (progress - 0.5) * 120;
      }

      ctx.translate(cameraX, cameraY);
      ctx.rotate(cameraRotation);
      ctx.scale(cameraZoom, cameraZoom);
      ctx.translate(-centerX, -centerY);

      // 2. Horizon / Grid or Landscape Perspective
      ctx.save();
      ctx.strokeStyle = isCyber ? 'rgba(236, 72, 153, 0.25)' : 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 1;

      const horizonY = height * 0.65;
      // Vanishing lines
      const vanishX = centerX + Math.sin(progress * Math.PI) * 20;
      for (let x = -width; x < width * 2; x += 60) {
        ctx.beginPath();
        ctx.moveTo(vanishX, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      // Horizontal perspective rungs
      for (let y = horizonY; y < height; y += 15 + (y - horizonY) * 0.3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Render 3D Depth Particles (floating spores/dust/rain)
      particles.forEach((p) => {
        p.z -= p.speed * 2.5;
        if (p.z <= 10) {
          p.z = 800;
          p.x = Math.random() * width - width / 2;
          p.y = Math.random() * height - height / 2;
        }

        const k = 300 / p.z;
        const px = p.x * k + centerX;
        const py = p.y * k + centerY;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const pSize = Math.max(0.8, p.size * k * 0.8);
          const alpha = Math.min(1, Math.max(0.1, (800 - p.z) / 500));
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = isCyber
            ? `hsla(${p.hue}, 90%, 65%, ${alpha})`
            : `rgba(224, 231, 255, ${alpha * 0.8})`;
          ctx.fill();
        }
      });

      // 4. Hero Visual Focal Point (Simulating subject & cinematic lighting)
      ctx.save();
      const subjectX = centerX + Math.sin(progress * 3) * 15;
      const subjectY = centerY - 20 + Math.cos(progress * 2) * 10;

      // Glow aura
      const radialGlow = ctx.createRadialGradient(subjectX, subjectY, 20, subjectX, subjectY, 180);
      if (isCyber) {
        radialGlow.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        radialGlow.addColorStop(0.5, 'rgba(236, 72, 153, 0.25)');
        radialGlow.addColorStop(1, 'transparent');
      } else if (isAnime) {
        radialGlow.addColorStop(0, 'rgba(251, 191, 36, 0.5)');
        radialGlow.addColorStop(0.6, 'rgba(244, 114, 182, 0.25)');
        radialGlow.addColorStop(1, 'transparent');
      } else {
        radialGlow.addColorStop(0, 'rgba(129, 140, 248, 0.45)');
        radialGlow.addColorStop(0.6, 'rgba(59, 130, 246, 0.15)');
        radialGlow.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(subjectX, subjectY, 180, 0, Math.PI * 2);
      ctx.fill();

      // Stylized Focal Glyph / Silhouette representing the prompt
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isCyber ? '#06b6d4' : '#818cf8';
      ctx.shadowBlur = 18;

      ctx.beginPath();
      ctx.arc(subjectX, subjectY, 45 + Math.sin(progress * 5) * 3, 0, Math.PI * 2);
      ctx.stroke();

      // Inner rotating geometric aperture
      ctx.save();
      ctx.translate(subjectX, subjectY);
      ctx.rotate(progress * Math.PI * 2);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const r = 26;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // Restore camera transform

      // 5. Cinematic Anamorphic Lens Flare
      ctx.save();
      const flareY = height * 0.42;
      const flareGrad = ctx.createLinearGradient(0, flareY, width, flareY);
      flareGrad.addColorStop(0, 'transparent');
      flareGrad.addColorStop(0.35, isCyber ? 'rgba(6, 182, 212, 0.08)' : 'rgba(99, 102, 241, 0.08)');
      flareGrad.addColorStop(0.5, isCyber ? 'rgba(6, 182, 212, 0.4)' : 'rgba(165, 180, 252, 0.4)');
      flareGrad.addColorStop(0.65, isCyber ? 'rgba(236, 72, 153, 0.08)' : 'rgba(99, 102, 241, 0.08)');
      flareGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, flareY - 4, width, 8);
      ctx.restore();

      // 6. Cinematic Vignette (using pre-cached gradient)
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, width, height);

      // 7. Timecode Overlay & Camera HUD
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '12px ui-monospace, monospace';
      ctx.fillText(`TC: 00:0${Math.floor(elapsed)}.${Math.floor((elapsed % 1) * 100).toString().padStart(2, '0')}`, 20, 30);
      ctx.fillText(`REC ● 24FPS [${config.cameraMovement}]`, 20, 48);
      ctx.fillText(`${config.style.toUpperCase()} | ${config.duration}`, width - 180, 30);

      if (isPlaying) {
        animationFrameId.current = requestAnimationFrame(render);
      }
    };

    if (isPlaying) {
      animationFrameId.current = requestAnimationFrame(render);
    } else {
      render(performance.now());
    }

    const handleVisibility = () => {
      if (document.hidden) {
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
      } else if (isPlaying) {
        animationFrameId.current = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [realVideoUrl, config, isPlaying, durationSec, isSoundMuted]);

  // Handle Play/Pause
  const togglePlay = () => {
    initAudio();
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    startTimeRef.current = performance.now();
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Record WebM from Canvas
  const handleRecordAndDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsRecording(true);
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setIsRecording(false);

        // Auto trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `cinematic_${config.style.toLowerCase()}_${Date.now()}.webm`;
        a.click();
      };

      // Restart and record 1 full loop
      handleRestart();
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, durationSec * 1000);
    } catch (err) {
      console.error('Error recording canvas:', err);
      setIsRecording(false);
    }
  };

  return (
    <div ref={containerRef} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
      {/* Top Header info bar */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-200">
            {realVideoUrl ? 'Google Veo Generated Video' : 'Cinematic Video Synthesizer'}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px]">
            {config.aspectRatio} • {config.duration} • {config.resolution}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isSoundMuted ? 'Unmute Ambient Tone' : 'Mute Ambient Tone'}
          >
            {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
          </button>
          <span className="text-slate-400 font-mono text-[11px]">
            {currentTime.toFixed(1)}s / {durationSec}.0s
          </span>
        </div>
      </div>

      {/* Video / Canvas Viewport */}
      <div className="relative bg-black flex items-center justify-center overflow-hidden min-h-[340px] md:min-h-[420px]">
        {realVideoUrl ? (
          <video
            src={realVideoUrl}
            controls
            autoPlay
            loop
            className="max-h-[500px] w-full object-contain"
          />
        ) : (
          <canvas
            ref={canvasRef}
            onClick={togglePlay}
            className="w-full max-h-[500px] object-contain cursor-pointer"
          />
        )}

        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-purple-500/20 border-b-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <Film className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">Generating Cinematic Frames...</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Rendering motion vectors, lighting passes, and 24fps camera trajectory
            </p>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 left-4 bg-red-600/90 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 font-semibold shadow-lg animate-pulse z-20">
            <span className="w-2 h-2 rounded-full bg-white" />
            Recording WebM ({Math.round(currentTime)}s / {durationSec}s)...
          </div>
        )}
      </div>

      {/* Progress / Timeline Bar */}
      <div className="w-full bg-slate-800 h-1.5 cursor-pointer relative group">
        <div
          className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full relative"
          style={{ width: `${(currentTime / durationSec) * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Playback Controls & Export */}
      <div className="p-4 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <button
            onClick={handleRestart}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all cursor-pointer"
            title="Restart from beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="hidden sm:block ml-2 text-xs text-slate-400 font-mono">
            {config.cameraMovement} • {config.style}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {realVideoUrl ? (
            <a
              href={realVideoUrl}
              download="veo_generated_video.mp4"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download Veo Video (MP4)
            </a>
          ) : (
            <button
              onClick={handleRecordAndDownload}
              disabled={isRecording}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isRecording
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              {isRecording ? 'Capturing Video...' : 'Export Motion as WebM'}
            </button>
          )}
        </div>
      </div>

      {/* Director Notes & Scene Breakdown */}
      {enhancement?.directorNotes && (
        <div className="p-4 bg-slate-900/60 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            AI Director Cinematography Specifications
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Camera Lens</span>
              <span className="text-slate-200 font-mono text-[11px] truncate block">{enhancement.directorNotes.lens}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Camera Path</span>
              <span className="text-slate-200 font-mono text-[11px] truncate block">{enhancement.directorNotes.cameraMovement}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Lighting</span>
              <span className="text-slate-200 font-mono text-[11px] truncate block">{enhancement.directorNotes.lighting}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Color Grade</span>
              <span className="text-slate-200 font-mono text-[11px] truncate block">{enhancement.directorNotes.colorGrading}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
