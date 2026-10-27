import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { completeOrganizationSetup, fetchOrgProfile } from "../lib/org";

export default function OrgSetupPage() {
  const { ready, isAuthenticated, mode, membership, membershipReady, refreshMembership } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!membership) return;
    setName(membership.orgName || "");
    void fetchOrgProfile(membership.organizationId)
      .then((org) => {
        setName(org.name);
        setBillingEmail(org.billingEmail || "");
      })
      .catch(() => undefined);
  }, [membership]);

  if (!ready || (isAuthenticated && mode !== "demo" && !membershipReady)) {
    return <p className="p-8 text-sm text-ink/60">読み込み中…</p>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mode === "demo") return <Navigate to="/capture" replace />;
  if (membership?.onboardingCompleted) return <Navigate to="/capture" replace />;
  if (!membership) return <Navigate to="/signup" replace />;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <form
        className="w-full max-w-lg rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          setError("");
          try {
            await completeOrganizationSetup(membership.organizationId, {
              name: name.trim(),
              billingEmail: billingEmail.trim(),
            });
            await refreshMembership();
            navigate("/capture", { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : "保存に失敗しました");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">セットアップ</p>
        <h1 className="font-display mt-3 text-3xl font-bold">会社情報の確認</h1>
        <p className="mt-3 text-sm text-ink/65">あとから設定画面でも変更できます。</p>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <label className="mt-5 block text-xs text-ink/55">
          会社名
          <input
            required
            className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-xs text-ink/55">
          契約・連絡用メール
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-6 w-full rounded-lg bg-mint py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "保存中…" : "はじめる"}
        </button>
      </form>
    </div>
  );
}
