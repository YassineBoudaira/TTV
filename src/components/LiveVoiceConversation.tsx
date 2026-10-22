import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, Volume2, VolumeX, MessageSquare, Play, X, User } from 'lucide-react';

interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}

export const LiveVoiceConversation: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ConversationTurn[]>([
    { role: 'model', text: 'Hello! I am your AI Video Director powered by Gemini 3.8 Live. What video idea would you like to create or brainstorm?' },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isTalking, setIsTalking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const speakText = (text: string) => {
    if (isMuted) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis not permitted');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newMessages: ConversationTurn[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInputText('');
    setIsTalking(true);

    try {
      const res = await fetch('/api/live-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-6),
        }),
      });

      const data = await res.json();
      const reply = data.reply || 'Let us brainstorm that video scene!';
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
      speakText(reply);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'I had trouble connecting. Let us try that again!' },
      ]);
    } finally {
      setIsTalking(false);
    }
  };

  const startVoiceInput = async () => {
    try {
      setIsListening(true);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          // Transcribe user speech first with gemini-3.5-transcribe
          try {
            const transRes = await fetch('/api/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio, mimeType: 'audio/webm' }),
            });
            const transData = await transRes.json();
            if (transData.text) {
              handleSendMessage(transData.text);
            }
          } catch {
            handleSendMessage('Help me brainstorm an engaging short video.');
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-xl w-full flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Real-Time Voice Assistant
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  gemini-3.8-live
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Conversational creative director & brainstorming</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation Message List */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-2xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isTalking && (
            <div className="flex items-center gap-2 text-indigo-400 text-xs italic">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Gemini 3.8 Live is thinking and speaking...</span>
            </div>
          )}
        </div>

        {/* Input Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask anything or speak to brainstorm video shots..."
              className="flex-1 rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500"
            />

            {isListening ? (
              <button
                onClick={stopVoiceInput}
                className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md animate-pulse cursor-pointer"
                title="Stop recording"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                onClick={startVoiceInput}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition-colors cursor-pointer"
                title="Speak to Gemini"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => handleSendMessage()}
              disabled={isTalking || !inputText.trim()}
              className="px-4 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white text-xs disabled:opacity-50 cursor-pointer"
            >
              Send
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>💡 Tap Mic to talk in real-time or type above</span>
            <span>Live Audio: 16kHz capture → 24kHz speech response</span>
          </div>
        </div>
      </div>
    </div>
  );
};
