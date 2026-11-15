import { useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Mic, Square, Upload } from "lucide-react";
import { loadPdf, type SlidePage } from "@/lib/pdf";
import { SlideRecorder } from "@/lib/recorder";
import { useAuth } from "@/components/AuthProvider";
import LoginPage from "@/components/LoginPage";
import { pickDefaultEngine, type AsrSession } from "@/lib/asr";
import {
  cleanSegment,
  composeJapaneseInterim,
  finalizeText,
  joinSegment,
  type SpeechVocabulary,
} from "@/lib/speech";
import { ApiError, getByokKey, improveScript, reviewScript, setByokKey, toEnglish } from "@/lib/aiClient";
import { formatDictionaryText, loadUserDictionary, parseDictionaryText, saveUserDictionary } from "@/lib/userDictionary";

const VOCAB_LABEL: Record<SpeechVocabulary, string> = {
  academic: "医療＋科学（標準）",
  medical: "医療系",
  science: "科学・物理系",
  general: "一般",
};

function Workbench() {
  const [slides, setSlides] = useState<SlidePage[]>([]);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [vocab, setVocab] = useState<SpeechVocabulary>("academic");
  const [lang, setLang] = useState<"ja-JP" | "en-US">("ja-JP");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dictText, setDictText] = useState(() => formatDictionaryText(loadUserDictionary()));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");
  const [byok, setByok] = useState(getByokKey());
  const recorder = useRef(new SlideRecorder());
  const speech = useRef<AsrSession | null>(null);

  const engine = pickDefaultEngine();
  const auth = useAuth();
  const canUseAi = Boolean(auth.user) || (import.meta.env.DEV && !auth.configured);

  async function onPdf(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setSlides(await loadPdf(file));
      setCurrent(0);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setError("");
    setInterim("");
    await recorder.current.start();
    if (!engine) {
      setError("この環境では音声認識が使えません。PC の Chrome 最新版でお試しください。");
      await recorder.current.stop().catch(() => undefined);
      return;
    }
    // 音声が端末外に出ないエンジンだけを既定で使う（pickDefaultEngine）
    const handle = await engine.start({
      lang,
      vocabulary: vocab,
      hints: loadUserDictionary().map((e) => e.term),
      onPreparing: setStatus,
      onInterim: (t) => setInterim(t),
      onFinal: (t) => {
        setInterim("");
        setTranscript((prev) => (lang === "ja-JP" ? joinSegment(prev, cleanSegment(t, vocab)) : `${prev} ${t}`.trim()));
      },
      onError: setError,
    });
    setStatus("");
    speech.current = handle;
    if (!handle) {
      await recorder.current.stop().catch(() => undefined);
      return;
    }
    setRecording(true);
  }

  async function stop() {
    speech.current?.stop();
    speech.current = null;
    const r = await recorder.current.stop();
    setAudioUrl(URL.createObjectURL(r.blob));
    setRecording(false);
    setInterim("");
    if (lang === "ja-JP") setTranscript((p) => finalizeText(p));
  }

  async function runAi(kind: "improve" | "english" | "review") {
    setAiError("");
    setAiBusy(true);
    try {
      const glossary = loadUserDictionary().map((e) => e.term);
      if (kind === "improve") {
        const r = await improveScript(transcript, { glossary });
        setAiResult(r.improved + (r.notes.length ? `\n\n【確認してください】\n- ${r.notes.join("\n- ")}` : ""));
      } else if (kind === "english") {
        const r = await toEnglish(transcript, { glossary });
        setAiResult(r.english + (r.pronunciationTips.length ? `\n\n【発音・強勢】\n- ${r.pronunciationTips.join("\n- ")}` : ""));
      } else {
        const r = await reviewScript(transcript, { glossary });
        setAiResult(
          `想定時間: 約${r.estimatedMinutes}分\n\n【構成】\n- ${r.structure.join("\n- ")}\n\n【わかりやすさ】\n- ${r.clarity.join("\n- ")}\n\n【想定質問】\n- ${r.likelyQuestions.join("\n- ")}`,
        );
      }
    } catch (e) {
      setAiError(e instanceof ApiError ? e.message : "AI の呼び出しに失敗しました");
    } finally {
      setAiBusy(false);
    }
  }

  const slide = slides[current];
  const live = lang === "ja-JP" ? composeJapaneseInterim(transcript, interim) : `${transcript} ${interim}`.trim();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PreDeck（プレデキ）</h1>
        {auth.user && (
          <button onClick={() => void auth.signOut()} className="text-sm text-slate-400 underline">
            {auth.user.email ?? "ログイン中"}（ログアウト）
          </button>
        )}
      </div>
            <p className="mt-1 text-sm text-slate-400">
        スライドと音声はこの端末の外に出ません。AI にはテキストだけを送ります。
      </p>
      {!engine && (
        <p className="mt-3 rounded bg-amber-900/40 p-3 text-sm">
          この環境では音声認識が使えません。PC の Chrome 最新版でお試しください。
        </p>
      )}

      <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold">
        <Upload size={16} /> PDF を選ぶ
        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onPdf(e.target.files?.[0])} />
      </label>
      {busy && <p className="mt-3 text-sm">読み込み中…</p>}

      {slide && (
        <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div>
            <img src={slide.dataUrl} alt={`slide ${slide.index}`} className="w-full rounded border border-slate-700" />
            <div className="mt-3 flex items-center gap-3">
              <button className="rounded border border-slate-600 px-3 py-1" disabled={current === 0} onClick={() => setCurrent(current - 1)}>前</button>
              <span className="text-sm">{current + 1} / {slides.length}</span>
              <button className="rounded border border-slate-600 px-3 py-1" disabled={current >= slides.length - 1} onClick={() => setCurrent(current + 1)}>次</button>
            </div>
          </div>
          <div>
            <div className="mb-3 flex gap-2 text-sm">
              <select value={vocab} onChange={(e) => setVocab(e.target.value as SpeechVocabulary)} disabled={recording} className="rounded border border-slate-600 bg-slate-900 px-2 py-1">
                {Object.entries(VOCAB_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={lang} onChange={(e) => setLang(e.target.value as "ja-JP" | "en-US")} disabled={recording} className="rounded border border-slate-600 bg-slate-900 px-2 py-1">
                <option value="ja-JP">日本語</option>
                <option value="en-US">English</option>
              </select>
            </div>
            <button onClick={recording ? stop : start} className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold ${recording ? "bg-red-600" : "bg-orange-500"}`}>
              {recording ? <Square size={16} /> : <Mic size={16} />}
              {recording ? "録音を止める" : "録音して文字起こし"}
            </button>
            {status && <p className="mt-2 text-xs text-slate-400">{status}</p>}
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            {audioUrl && <audio controls src={audioUrl} className="mt-3 w-full" />}
          </div>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-300">文字起こし</h2>
      <textarea
        value={live}
        onChange={(e) => setTranscript(e.target.value)}
        rows={6}
        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-3 text-sm"
        placeholder="録音を始めると、ここに文字起こしが表示されます（手で直せます）"
      />

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <button disabled={aiBusy || !canUseAi || !transcript.trim()} onClick={() => runAi("improve")} className="rounded bg-blue-600 px-3 py-1.5 font-semibold disabled:opacity-40">AI で原稿を整える</button>
        <button disabled={aiBusy || !canUseAi || !transcript.trim()} onClick={() => runAi("english")} className="rounded bg-emerald-600 px-3 py-1.5 font-semibold disabled:opacity-40">英語原稿にする</button>
        <button disabled={aiBusy || !canUseAi || !transcript.trim()} onClick={() => runAi("review")} className="rounded bg-slate-600 px-3 py-1.5 font-semibold disabled:opacity-40">構成を評価</button>
        {!canUseAi && <span className="self-center text-xs text-slate-400">AI 機能はログインすると使えます</span>}
        {aiBusy && <span className="self-center text-slate-400">AI が処理中…（送るのはテキストのみ）</span>}
      </div>
      {aiError && <p className="mt-2 text-sm text-red-400">{aiError}</p>}
      {aiResult && <pre className="mt-3 whitespace-pre-wrap rounded border border-slate-700 bg-slate-900 p-3 text-sm">{aiResult}</pre>}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-semibold text-slate-300">自分の AI キー（任意・無料枠を使わない）</summary>
        <p className="mt-2 text-xs text-slate-400">Gemini の API キーを入れると、無料枠とは別に使えます。この端末にだけ保存され、当社のサーバーには保存されません。</p>
        <input type="password" value={byok} onChange={(e) => setByok(e.target.value)} onBlur={() => setByokKey(byok.trim())} className="mt-2 w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm" placeholder="AIza..." />
      </details>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-semibold text-slate-300">マイ辞書（専門用語）</summary>
        <p className="mt-2 text-xs text-slate-400">1 行に 1 語。「正しい表記=誤認識されやすい表記,…」の形式で書けます。この端末にだけ保存されます。</p>
        <textarea
          value={dictText}
          onChange={(e) => setDictText(e.target.value)}
          onBlur={() => saveUserDictionary(parseDictionaryText(dictText))}
          rows={5}
          className="mt-2 w-full rounded border border-slate-700 bg-slate-900 p-3 font-mono text-sm"
          placeholder={"ペロブスカイト太陽電池=ぺろぶすかいとたいようでんち\nニボルマブ"}
        />
      </details>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  // アプリの利用にはログイン必須。Firebase 未設定の開発環境（npm run dev）だけ例外。
  const devBypass = import.meta.env.DEV && !auth.configured;
  if (!devBypass) {
    if (!auth.ready) return <p className="p-6 text-sm text-slate-400">読み込み中…</p>;
    if (!auth.configured) return <p className="p-6 text-sm text-red-400">ログインの設定がありません。管理者に連絡してください。</p>;
    if (!auth.user) return <LoginPage />;
  }
  return (
    <Routes>
      <Route path="*" element={<Workbench />} />
    </Routes>
  );
}


