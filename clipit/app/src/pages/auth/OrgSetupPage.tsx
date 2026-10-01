import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Stethoscope, Briefcase, Rocket } from "lucide-react";
import { useAuth } from "../../components/AuthProvider";
import { useOrg } from "../../context/OrgContext";
import { completeOrganizationSetup } from "../../services/bootstrap";
import type { OrgType } from "../../types";

const TYPES: { id: OrgType; label: string; desc: string; icon: typeof Building2 }[] = [
  { id: "clinic", label: "クリニック・医療", desc: "電子カルテ・受付・会計の手順", icon: Stethoscope },
  { id: "smb", label: "中小企業・店舗", desc: "社内業務・接客・バックオフィス", icon: Briefcase },
  { id: "startup", label: "スタートアップ", desc: "SaaS操作・CS向けヘルプ", icon: Rocket },
];

export default function OrgSetupPage() {
  const navigate = useNavigate();
  const { user, demoMode } = useAuth();
  const { organization, profile, refresh } = useOrg();
  const [name, setName] = useState(organization?.name ?? profile?.name ?? "");
  const [type, setType] = useState<OrgType>(organization?.type ?? "smb");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (demoMode) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  if (organization?.onboardingCompleted) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await completeOrganizationSetup(organization.id, {
        name: name.trim(),
        type,
        ownerName: profile?.name || name.trim(),
      });
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <span className="clipit-icon-frame mx-auto h-14 w-14">
            <img src="/icon.png" alt="" className="clipit-brand-icon h-full w-full object-contain" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">はじめに、組織を設定</h1>
          <p className="mt-2 text-sm text-slate-600">
            あとから設定画面でも変更できます。30秒で完了します。
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>
        )}

        <label className="mt-6 block text-sm font-semibold text-slate-800">施設名・会社名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="例：さくら内科クリニック"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
        />

        <p className="mt-6 text-sm font-semibold text-slate-800">業種（テンプレートのおすすめに使います）</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                type === t.id
                  ? "border-primary-400 bg-primary-50 ring-2 ring-primary-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <t.icon size={18} className="text-primary-600" />
              <p className="mt-2 text-xs font-bold text-slate-900">{t.label}</p>
              <p className="mt-1 text-[10px] leading-snug text-slate-500">{t.desc}</p>
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-8 w-full rounded-xl bg-primary-500 py-3.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {busy ? "保存中…" : "はじめる"}
        </button>
      </form>
    </div>
  );
}
