import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";

const ROUTES: Array<{ keywords: RegExp; path: string; label: string }> = [
  { keywords: /一括|まとめて|置換|変更|更新|freee|システム/, path: "/bulk-update", label: "まとめて修正" },
  { keywords: /話して|Meet|文字起こし|説明/, path: "/manuals/new/talk", label: "話して作成" },
  { keywords: /スクショ|画像|写真/, path: "/manuals/new/screenshots", label: "スクショから作成" },
  { keywords: /記録|拡張|クリック/, path: "/manuals/new/record", label: "クリック記録" },
  { keywords: /テンプレ|ひな形/, path: "/templates", label: "テンプレート" },
  { keywords: /設定|変数|共通|ルール|辞書/, path: "/settings", label: "設定" },
  { keywords: /スタッフ|招待|チーム/, path: "/team", label: "スタッフ" },
];

export default function AssistantPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");

  const ask = () => {
    const text = input.trim();
    if (!text) return;
    const match = ROUTES.find((r) => r.keywords.test(text));
    if (match) {
      setReply(`「${match.label}」が向いています。画面を開きますか？`);
      setTimeout(() => navigate(match.path), 800);
      return;
    }
    if (/古い|期限|賞味/.test(text)) {
      setReply("ダッシュボードの「古い情報の可能性」を確認し、必要ならまとめて修正へ進んでください。");
      navigate("/dashboard");
      return;
    }
    setReply("マニュアルを新規作成する場合は「新しく作る」、既存を直す場合は「まとめて修正」をお試しください。");
  };

  return (
    <>
      <PageHeader title="ClipIt アシスタント" description="やりたいことを日本語で入力（ベータ）" />
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Bot className="text-primary-600" size={20} />
            例
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>・予約システムが変わったので関連マニュアルを直したい</li>
            <li>・Meetで説明した内容をマニュアルにしたい</li>
            <li>・問い合わせ先の変数を設定したい</li>
          </ul>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder="やりたいことを入力…"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={ask}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white"
        >
          <Sparkles size={16} /> 案内する
        </button>
        {reply && <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{reply}</p>}
      </div>
    </>
  );
}
