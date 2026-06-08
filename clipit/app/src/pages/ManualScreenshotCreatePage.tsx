import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { folderIdFromSearch } from "../lib/folderContext";
import { ImageUp, Loader2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { AUDIENCE_OPTIONS, labelsToAudience } from "../lib/format";
import { createManual } from "../services/manuals";
import { ingestTalkSteps } from "../services/talkCreate";
import type { TargetAudience } from "../types";

type Shot = { id: string; base64: string; previewUrl: string; caption: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result as string;
      resolve(data.includes(",") ? data.split(",")[1]! : data);
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

export default function ManualScreenshotCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFolderId = folderIdFromSearch(searchParams);
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>(["新人スタッフ向け"]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (label: string) =>
    setSelected((cur) => (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]));

  const onFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const next: Shot[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await fileToBase64(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        base64,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      });
    }
    setShots((cur) => [...cur, ...next]);
  }, []);

  const create = async () => {
    if (!title.trim() || !shots.length || !organization || !user) return;
    if (demoMode) {
      navigate("/manuals/demo-1/edit");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const audiences = labelsToAudience(selected) as TargetAudience[];
      const manualId = await createManual({
        organizationId: organization.id,
        title: title.trim(),
        targetAudience: audiences.length ? audiences : ["new_staff"],
        createdBy: user.uid,
        creationSource: "screenshot",
        folderId: presetFolderId,
      });
      await ingestTalkSteps(
        manualId,
        shots.map((s, i) => ({
          title: s.caption.trim() || `手順 ${i + 1}`,
          instruction: s.caption.trim() || `画面 ${i + 1} の操作を確認してください。`,
          screenshotBase64: s.base64,
        })),
      );
      navigate(`/manuals/${manualId}/edit`);
    } catch (e) {
      setError((e as Error).message ?? "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="スクショから作る"
        description={
          <Link to="/manuals/new" className="text-primary-600 hover:underline">
            ← 作り方を選び直す
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {error && <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">{error}</p>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <label className="block text-sm font-semibold text-slate-800">マニュアル名</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <p className="mt-4 text-sm font-semibold text-slate-800">誰向けですか？</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map(({ label }) => (
              <button
                key={label}
                type="button"
                onClick={() => toggle(label)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  selected.includes(label) ? "border-primary-400 bg-primary-50 text-primary-700" : "border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ImageUp size={18} />
            画像をアップロード（順番が手順の並びになります）
          </div>
          <input type="file" accept="image/*" multiple className="mt-3 block w-full text-sm" onChange={(e) => onFiles(e.target.files)} />
          <div className="mt-4 space-y-3">
            {shots.map((s, i) => (
              <div key={s.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <img src={s.previewUrl} alt="" className="h-16 w-24 rounded object-cover" />
                <input
                  placeholder={`手順 ${i + 1} の説明（任意）`}
                  value={s.caption}
                  onChange={(e) =>
                    setShots((cur) => cur.map((x) => (x.id === s.id ? { ...x, caption: e.target.value } : x)))
                  }
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!title.trim() || !shots.length || busy}
          onClick={create}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="animate-spin" size={18} />}
          マニュアルを作成 → 編集画面で仕上げる
        </button>
      </div>
    </>
  );
}
