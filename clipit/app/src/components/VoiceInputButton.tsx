import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Props = {
  onText: (text: string, mode: 'append' | 'replace') => void;
  label?: string;
  className?: string;
};

export default function VoiceInputButton({ onText, label = '音声入力', className = '' }: Props) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const baseRef = useRef('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!getSpeechRecognition()) setSupported(false);
    return () => recognitionRef.current?.stop();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    if (listening) {
      stop();
      return;
    }

    baseRef.current = '';
    const rec = new Ctor();
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: SpeechRecognitionEvent) => {
      let chunk = '';
      for (let i = 0; i < event.results.length; i++) {
        chunk += event.results[i]![0]!.transcript;
      }
      const combined = `${baseRef.current}${chunk}`.trim();
      onText(combined, 'replace');
      if (event.results[event.results.length - 1]?.isFinal) {
        baseRef.current = `${baseRef.current}${chunk}`;
      }
    };
    rec.onerror = () => stop();
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  if (!supported) {
    return (
      <span className={`text-[11px] text-slate-400 ${className}`}>音声入力非対応（Chrome推奨）</span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        listening
          ? 'bg-danger-100 text-danger-700'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:text-primary-700'
      } ${className}`}
    >
      {listening ? <MicOff size={14} /> : <Mic size={14} />}
      {listening ? '音声入力を停止' : label}
      {listening && <Loader2 size={12} className="animate-spin" />}
    </button>
  );
}
