import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Share2, Sparkles, X } from "lucide-react";
import { useState } from "react";

type Props = {
  manualId: string;
  stepCount: number;
};

/** マニュアル作成直後（?new=1）に表示する次のステップ案内 */
export default function EditNextStepsBanner({ manualId, stepCount }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const isNew = searchParams.get("new") === "1";

  if (!isNew || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    searchParams.delete("new");
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="mx-6 mt-4 rounded-2xl border border-success-200 bg-gradient-to-r from-success-50 to-white p-5">
      <button
        type="button"
        onClick={dismiss}
        className="float-right text-slate-400 hover:text-slate-600"
        aria-label="閉じる"
      >
        <X size={18} />
      </button>
      <div className="flex items-center gap-2 text-sm font-bold text-success-800">
        <CheckCircle2 size={18} />
        マニュアルを作成しました
      </div>
      <ol className="mt-3 space-y-2 text-sm text-slate-700">
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary-600">1.</span>
          {stepCount === 0
            ? "手順を追加するか、Chrome拡張で操作を記録してください"
            : "手順の説明文を確認・編集してください（クリックで詳細編集）"}
        </li>
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary-600">2.</span>
          スクショに個人情報が写っていないか確認
        </li>
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary-600">3.</span>
          <Link to={`/manuals/${manualId}/share`} className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline">
            <Share2 size={14} /> 共有URLを発行してスタッフに渡す
          </Link>
        </li>
      </ol>
      {stepCount > 0 && (
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
          <Sparkles size={12} />
          編集ツールバーの「全手順AI」で説明文のたたき台を一括生成できます
        </p>
      )}
    </div>
  );
}
