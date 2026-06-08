import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { folderIdFromSearch } from "../lib/folderContext";
import { Chrome, ListOrdered } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { AUDIENCE_OPTIONS, labelsToAudience } from "../lib/format";
import { extensionInstallUrl } from "../lib/extensionBridge";
import { addDemoSteps, createManual } from "../services/manuals";
import type { TargetAudience } from "../types";

export default function ManualRecordCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFolderId = folderIdFromSearch(searchParams);
  const { profile, organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>(["新人スタッフ向け"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (label: string) =>
    setSelected((cur) => (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]));

  const create = async (withDemo: boolean) => {
    if (!title.trim()) return;
    if (demoMode) {
      navigate("/manuals/demo-1/edit");
      return;
    }
    if (!profile || !organization || !user) return;
    setBusy(true);
    setError("");
    try {
      const audiences = labelsToAudience(selected) as TargetAudience[];
      const id = await createManual({
        organizationId: organization.id,
        title,
        targetAudience: audiences.length ? audiences : ["new_staff"],
        createdBy: user.uid,
        creationSource: withDemo ? "demo" : "extension",
        folderId: presetFolderId,
      });
      if (withDemo) await addDemoSteps(id, title.trim());
      navigate(`/manuals/${id}/edit`);
    } catch (e) {
      setError((e as Error).message ?? "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="クリック操作を記録して作る"
        description={
          <>
            <Link to="/manuals/new" className="text-primary-600 hover:underline">
              ← 作り方を選び直す
            </Link>
          </>
        }
      />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {error && <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">{error}</p>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-800">マニュアル名</label>
          <input
            type="text"
            placeholder="例：新患受付の手順"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <p className="mt-6 text-sm font-semibold text-slate-800">誰向けのマニュアルですか？</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map(({ label }) => (
              <button
                key={label}
                type="button"
                onClick={() => toggle(label)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selected.includes(label)
                    ? "border-primary-400 bg-primary-50 text-primary-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-primary-300 bg-gradient-to-br from-primary-50 to-white p-6">
          <div className="flex items-center gap-2">
            <Chrome className="text-primary-600" size={22} />
            <h2 className="text-sm font-bold text-slate-900">Chrome拡張で記録</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            拡張をインストール → マニュアル作成後、編集画面の「拡張と連携」→ 記録開始。
            Alt+Shift+S で強制キャプチャ。
          </p>
          <a
            href={extensionInstallUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-primary-600 hover:underline"
          >
            拡張機能を入手する
          </a>
          <button
            type="button"
            disabled={!title.trim() || busy}
            onClick={() => create(false)}
            className="mt-4 w-full rounded-xl bg-primary-500 px-8 py-3.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {busy ? "作成中…" : "空のマニュアルを作成 → 記録へ"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <ListOrdered className="mx-auto text-slate-400" size={28} />
          <p className="mt-2 text-sm text-slate-600">すぐ試す場合は、サンプル手順3件付きで作成できます。</p>
          <button
            type="button"
            disabled={!title.trim() || busy}
            onClick={() => create(true)}
            className="mt-4 rounded-xl border border-slate-300 px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            デモ手順付きで作成
          </button>
        </div>
      </div>
    </>
  );
}
