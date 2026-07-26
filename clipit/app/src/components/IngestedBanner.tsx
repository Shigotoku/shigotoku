import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";

type Props = {
  stepCount: number;
  firstStepId?: string;
  aiApplied?: boolean;
  onRunAiAll?: () => void;
  aiBusy?: boolean;
};

/** 拡張・取り込み直後（?ingested=1）に表示 */
export default function IngestedBanner({
  stepCount,
  firstStepId,
  aiApplied,
  onRunAiAll,
  aiBusy,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const isIngested = searchParams.get("ingested") === "1";

  if (!isIngested || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    searchParams.delete("ingested");
    searchParams.delete("ai");
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="mx-6 mt-4 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-5">
      <button
        type="button"
        onClick={dismiss}
        className="float-right text-slate-400 hover:text-slate-600"
        aria-label="閉じる"
      >
        <X size={18} />
      </button>
      <div className="flex items-center gap-2 text-sm font-bold text-primary-900">
        <Sparkles size={18} />
        {stepCount} 手順を取り込み、説明文のたたき台を自動生成しました
        {aiApplied && "（AI推敲済み）"}
      </div>
      <p className="mt-2 text-sm text-slate-700">
        各手順の説明を読んで、現場に合わせて直してください。個人情報が写っていないかも確認しましょう。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!aiApplied && onRunAiAll && stepCount > 0 && (
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void onRunAiAll()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AIで文案を整える（全手順）
          </button>
        )}
        {stepCount > 0 && firstStepId && (
          <Link to={`?detail=${firstStepId}`} className="text-xs font-semibold text-primary-600 hover:underline">
            最初の手順を開く
          </Link>
        )}
      </div>
    </div>
  );
}
