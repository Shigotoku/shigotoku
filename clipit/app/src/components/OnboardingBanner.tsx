import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

const KEY = "clipit_onboarding_dismissed";

export default function OnboardingBanner() {
  const [open, setOpen] = useState(() => !localStorage.getItem(KEY));

  if (!open) return null;

  return (
    <div className="mx-6 mt-4 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-5">
      <button
        type="button"
        className="float-right text-slate-400 hover:text-slate-600"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setOpen(false);
        }}
        aria-label="閉じる"
      >
        <X size={18} />
      </button>
      <p className="text-sm font-bold text-slate-900">はじめの3ステップ</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>
          <Link to="/manuals/new" className="font-semibold text-primary-600 hover:underline">
            マニュアルを作る
          </Link>
          （テンプレートでもOK）
        </li>
        <li>編集画面で「拡張と連携」→ Chrome拡張で操作を記録</li>
        <li>
          <span className="font-semibold">共有</span> から URL / QR を発行
        </li>
      </ol>
    </div>
  );
}
