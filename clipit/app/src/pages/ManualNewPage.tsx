import { useState } from "react";
import PageHeader from "../components/PageHeader";

const audiences = ["新人スタッフ向け", "管理者向け", "患者向け", "社内向け", "SaaSユーザー向け"];

export default function ManualNewPage() {
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (a: string) =>
    setSelected((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  return (
    <>
      <PageHeader title="マニュアルを作る" description="名前と対象者を選んで、記録を開始します。" />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <label className="block text-sm font-semibold text-slate-800">マニュアル名</label>
          <input
            type="text"
            placeholder="例：新患受付の手順"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />

          <p className="mt-6 text-sm font-semibold text-slate-800">対象者を選んでください</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {audiences.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggle(a)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selected.includes(a)
                    ? "border-primary-400 bg-primary-50 text-primary-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 p-6 text-center">
          <p className="text-sm text-slate-600">
            「記録開始」を押すと Chrome拡張が起動し、いつも通りの操作を記録します。
            <br />
            <span className="text-xs text-slate-400">
              （拡張機能・記録パイプラインは Phase 1 で実装。要件定義書 §6 参照）
            </span>
          </p>
          <button
            type="button"
            disabled={!title.trim()}
            className="mt-4 rounded-xl bg-primary-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            記録開始
          </button>
        </div>
      </div>
    </>
  );
}
