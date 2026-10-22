import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Check, Copy, AlertCircle, Volume2 } from 'lucide-react';

interface AudioTranscribeProps {
  onTranscribed: (text: string) => void;
}

export const AudioTranscribe: React.FC<AudioTranscribeProps> = ({ onTranscribed }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      setTranscribedText('');
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendForTranscription(base64Audio);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMsg('Microphone access denied or not available. Please allow mic permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const sendForTranscription = async (base64Audio: string) => {
    try {
      setIsTranscribing(true);
      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: 'audio/webm',
        }),
      });

      const data = await res.json();
      if (data.success && data.text) {
        setTranscribedText(data.text);
        onTranscribed(data.text);
      } else {
        setErrorMsg(data.error || 'Transcription failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while transcribing');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = () => {
    if (!transcribedText) return;
    navigator.clipboard.writeText(transcribedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Mic className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold text-slate-200 block">Voice Input & Audio Transcription</span>
            <span className="text-[10px] text-slate-400 font-mono">Powered by `gemini-3.5-transcribe`</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="px-3 py-1.5 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-md animate-pulse cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Stop ({recordingSeconds}s)</span>
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={isTranscribing}
              className="px-3.5 py-1.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record Voice</span>
            </button>
          )}
        </div>
      </div>

      {isTranscribing && (
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2 text-indigo-300">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Transcribing your speech with Gemini 3.5 Transcribe...</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {transcribedText && (
        <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Transcribed Speech:
            </span>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
          <p className="text-slate-100 font-medium leading-relaxed italic">
            "{transcribedText}"
          </p>
        </div>
      )}
    </div>
  );
};
