import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { syncVoiceTranscript } from '../lib/extensionBridge';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceMemoPanel() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const pushTranscript = useCallback((text: string) => {
    setTranscript(text);
    syncVoiceTranscript(text);
    try {
      sessionStorage.setItem('clipit_voice_transcript', text);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const saved = sessionStorage.getItem('clipit_voice_transcript');
    if (saved) {
      setTranscript(saved);
      syncVoiceTranscript(saved);
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggle = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new Ctor();
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        finalText += event.results[i]![0]!.transcript;
      }
      pushTranscript(finalText.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        このブラウザは音声認識に未対応です（Chrome 推奨）。手順の「注意メモ」に直接入力できます。
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
            listening
              ? 'bg-danger-100 text-danger-700'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {listening ? <MicOff size={14} /> : <Mic size={14} />}
          {listening ? '音声メモを停止' : '音声メモを開始'}
        </button>
        {listening && (
          <span className="inline-flex items-center gap-1 text-xs text-primary-600">
            <Loader2 size={12} className="animate-spin" /> 話した内容を各手順のメモに反映します
          </span>
        )}
      </div>
      {transcript ? (
        <p className="mt-3 max-h-24 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          {transcript}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          記録中に口頭で説明すると、停止時に手順ごとの「注意メモ」へ自動配分されます（AI クォータ不要）。
        </p>
      )}
    </div>
  );
}
