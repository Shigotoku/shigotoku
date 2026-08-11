import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { LANDING_URL, API_URL } from "../lib/urls";
import { pingExtension } from "../lib/extensionBridge";
import { APP_VERSION, detectEnvironment } from "../lib/meta";
import {
  anonymizeMyData,
  deleteAllMyData,
  loadSettings,
  resetDemoData,
  saveSettings,
  seedIfEmpty,
  type DemoSettings,
} from "../lib/demoStore";
import { createFeedback } from "../lib/demoStore";
import {
  downloadText,
  exportFeedbackCsv,
  exportIssuesCsv,
  exportJson,
  parseFeedbackCsv,
} from "../lib/export";
import { loadRole, saveRole, ROLE_LABELS, canManageSettings, type AppRole } from "../lib/roles";
import {
  inviteMember,
  listMembers,
  listProjects,
  removeMember,
  setActiveProject,
  upsertProject,
  getActiveProjectId,
} from "../lib/members";
import { getLocale, setLocale, t } from "../lib/i18n";
import {
  fetchMyMemberProfile,
  fetchOrgProfile,
  inviteOrgMemberByEmail,
  listOrgInvites,
  listOrgMembers,
  mapOrgRoleToAppRole,
  removeOrgInvite,
  removeOrgMember,
  updateMyDisplayName,
  updateOrgName,
  type OrgInvite,
  type OrgMember,
} from "../lib/org";

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-ink/10 bg-white p-3 text-xs ${className}`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink/55">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-ink/55">{label}</span>
      <div className="mt-0.5">{children}</div>
      {hint && <p className="mt-0.5 text-[10px] text-ink/40">{hint}</p>}
    </label>
  );
}

export default function SettingsPage() {
  const { user, mode } = useAuth();
  const locale = getLocale();
  const [extOk, setExtOk] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<DemoSettings>(() => loadSettings());
  const [role, setRole] = useState<AppRole>(() => loadRole());
  const [members, setMembers] = useState(() => listMembers());
  const [inviteEmail, setInviteEmail] = useState("");
  const [csvPreview, setCsvPreview] = useState<{ rawText: string; pageUrl?: string }[] | null>(null);
  const [projects, setProjects] = useState(() => listProjects());
  const [activeProject, setActive] = useState(() => getActiveProjectId());
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [cloudMembers, setCloudMembers] = useState<OrgMember[]>([]);
  const [cloudInvites, setCloudInvites] = useState<OrgInvite[]>([]);
  const [cloudRole, setCloudRole] = useState<AppRole>("member");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  const effectiveRole = mode === "google" ? cloudRole : role;
  const isOrgAdmin = canManageSettings(effectiveRole);

  useEffect(() => {
    void pingExtension().then(setExtOk);
  }, []);

  useEffect(() => {
    if (mode === "demo") {
      const s = loadSettings();
      setCompanyName(s.companyName ?? "");
      setDisplayName(s.displayName ?? "");
      return;
    }
    if (mode !== "google") return;
    void (async () => {
      try {
        const [org, me, mems, invs] = await Promise.all([
          fetchOrgProfile(),
          fetchMyMemberProfile(),
          listOrgMembers(),
          listOrgInvites(),
        ]);
        setCompanyName(org.name);
        setDisplayName(me.name);
        setCloudRole(mapOrgRoleToAppRole(me.role));
        setCloudMembers(mems);
        setCloudInvites(invs);
      } catch {
        /* ignore */
      }
    })();
  }, [mode]);

  const patch = (p: Partial<DemoSettings>) => setSettings(saveSettings(p));
  const memberHint = useMemo(() => members.map((m) => `@${m.name}`).join(" "), [members]);

  const saveProfile = async () => {
    setProfileBusy(true);
    setProfileMsg("");
    try {
      if (mode === "demo") {
        saveSettings({ companyName: companyName.trim(), displayName: displayName.trim() });
        const m = listMembers();
        if (m[0]) {
          m[0] = { ...m[0], name: displayName.trim() || m[0].name };
          localStorage.setItem("shapeit:members:v1", JSON.stringify(m));
          setMembers(m);
        }
        setProfileMsg(locale === "ja" ? "保存しました" : "Saved");
      } else {
        await updateMyDisplayName(displayName);
        if (isOrgAdmin) await updateOrgName(companyName);
        const [mems, invs] = await Promise.all([listOrgMembers(), listOrgInvites()]);
        setCloudMembers(mems);
        setCloudInvites(invs);
        setProfileMsg(locale === "ja" ? "保存しました" : "Saved");
      }
    } catch (e) {
      setProfileMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setProfileBusy(false);
    }
  };

  const refreshCloudMembers = async () => {
    const [mems, invs] = await Promise.all([listOrgMembers(), listOrgInvites()]);
    setCloudMembers(mems);
    setCloudInvites(invs);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">Settings</p>
          <h1 className="font-display text-2xl font-bold">{t("settings", locale)}</h1>
        </div>
        <p className="text-[10px] text-ink/45">
          App {APP_VERSION} · env {settings.environmentOverride || detectEnvironment()}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Section title={locale === "ja" ? "組織・プロフィール" : "Organization & profile"} className="xl:col-span-2">
          <p className="text-[10px] text-ink/50">{t("org_company_hint", locale)}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={t("org_company_name", locale)}>
              <input
                className="w-full rounded border border-ink/10 px-2 py-1.5 text-sm disabled:bg-paper"
                value={companyName}
                disabled={mode === "google" && !isOrgAdmin}
                placeholder={locale === "ja" ? "例: 株式会社〇〇" : "e.g. Acme Inc."}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </Field>
            <Field label={t("org_display_name", locale)}>
              <input
                className="w-full rounded border border-ink/10 px-2 py-1.5 text-sm"
                value={displayName}
                placeholder={locale === "ja" ? "例: 山田 太郎" : "e.g. Jane Doe"}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-[10px] text-ink/45">
            {mode === "google" ? `Google: ${user?.email}` : "デモモード（ブラウザ内保存）"}
            {mode === "google" && ` · ${ROLE_LABELS[effectiveRole]}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={profileBusy}
              className="rounded bg-mint px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
              onClick={() => void saveProfile()}
            >
              {profileBusy ? (locale === "ja" ? "保存中…" : "Saving…") : locale === "ja" ? "保存" : "Save"}
            </button>
            {profileMsg && <span className="text-[10px] text-ink/55">{profileMsg}</span>}
            <Link to="/onboarding" className="text-[10px] text-mint hover:underline">
              セットアップ →
            </Link>
            <Link to="/integrations" className="text-[10px] text-mint hover:underline">
              連携 →
            </Link>
          </div>
        </Section>

        <Section title={locale === "ja" ? "アカウント（デモ）" : "Account (demo)"}>
          {mode === "demo" && (
            <Field label="ロール（AUTH-001 デモ）">
              <select
                className="w-full rounded border border-ink/10 px-2 py-1.5 text-sm"
                value={role}
                onChange={(e) => {
                  const r = e.target.value as AppRole;
                  saveRole(r);
                  setRole(r);
                }}
              >
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </Field>
          )}
          {mode === "google" && (
            <p className="text-[10px] text-ink/55">
              {locale === "ja"
                ? "ロールは組織の管理者が割り当てます。"
                : "Role is assigned by your org admin."}
            </p>
          )}
        </Section>

        <Section title={t("org_members", locale)} className="xl:col-span-2">
          {mode === "google" ? (
            <>
              {isOrgAdmin && (
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded border border-ink/10 px-2 py-1.5 text-sm"
                    placeholder="invite@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded bg-mint px-3 py-1.5 text-[11px] font-semibold text-white"
                    onClick={() => {
                      if (!inviteEmail.trim()) return;
                      setInviteMsg("");
                      void inviteOrgMemberByEmail(inviteEmail.trim(), "member", companyName)
                        .then((result) => {
                          setInviteEmail("");
                          setInviteMsg(
                            result.emailSent
                              ? locale === "ja"
                                ? "招待メールを送信しました"
                                : "Invitation email sent"
                              : locale === "ja"
                                ? "招待を登録しました（メールは未送信）"
                                : "Invite saved (email not sent)",
                          );
                          return refreshCloudMembers();
                        })
                        .catch((err) =>
                          setInviteMsg(err instanceof Error ? err.message : "招待に失敗しました"),
                        );
                    }}
                  >
                    {t("org_invite", locale)}
                  </button>
                </div>
              )}
              <ul className="max-h-32 space-y-1 overflow-y-auto">
                {cloudMembers.map((m) => (
                  <li key={m.uid} className="flex justify-between gap-2 rounded bg-paper px-2 py-1">
                    <span className="truncate">
                      {m.name} · {m.email} · {m.role}
                    </span>
                    {isOrgAdmin && m.uid !== user?.uid && (
                      <button
                        type="button"
                        className="shrink-0 text-ink/40 hover:text-red-600"
                        onClick={() => void removeOrgMember(m.uid).then(() => refreshCloudMembers())}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
                {cloudInvites.map((inv) => (
                  <li key={inv.id} className="flex justify-between gap-2 rounded bg-amber-50 px-2 py-1 text-amber-900">
                    <span className="truncate">
                      {inv.email} · {t("org_invited", locale)} · {inv.role}
                    </span>
                    {isOrgAdmin && (
                      <button
                        type="button"
                        className="shrink-0"
                        onClick={() => void removeOrgInvite(inv.id).then(() => refreshCloudMembers())}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {inviteMsg && <p className="text-[10px] text-ink/55">{inviteMsg}</p>}
            </>
          ) : (
            <>
              <Field label="アクティブ Project">
                <select
                  className="w-full rounded border border-ink/10 px-2 py-1.5 text-sm"
                  value={activeProject}
                  onChange={(e) => {
                    setActiveProject(e.target.value);
                    setActive(e.target.value);
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                className="rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold"
                onClick={() => {
                  const name = window.prompt("新 Project 名");
                  if (!name?.trim()) return;
                  const p = upsertProject(name.trim());
                  setProjects(listProjects());
                  setActive(p.id);
                }}
              >
                Project 追加
              </button>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded border border-ink/10 px-2 py-1.5 text-sm"
                  placeholder="invite@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded bg-mint px-3 py-1.5 text-[11px] font-semibold text-white"
                  onClick={() => {
                    if (!inviteEmail.trim()) return;
                    inviteMember(inviteEmail.trim(), "member");
                    setInviteEmail("");
                    setMembers(listMembers());
                  }}
                >
                  招待
                </button>
              </div>
              <ul className="max-h-24 space-y-1 overflow-y-auto">
                {members.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2 rounded bg-paper px-2 py-1">
                    <span className="truncate">{m.name} · {m.email} · {m.role}</span>
                    {m.id !== "m1" && (
                      <button type="button" onClick={() => { removeMember(m.id); setMembers(listMembers()); }}>×</button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-ink/40">@mention: {memberHint || "@demo"}</p>
            </>
          )}
        </Section>

        <Section title="自動トリアージ">
          <p className="text-[10px] text-ink/45">S0 / SECURITY は常に対象外</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoTriageEnabled}
              onChange={(e) => patch({ autoTriageEnabled: e.target.checked })}
            />
            自動適用
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Field label="最小 Confidence">
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={settings.autoTriageMinConfidence}
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                onChange={(e) => patch({ autoTriageMinConfidence: Number(e.target.value) })}
              />
            </Field>
            <Field label="SLA（h）">
              <input
                type="number"
                min={1}
                value={settings.triageSlaHours}
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                onChange={(e) => patch({ triageSlaHours: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>

        <Section title="表示・言語">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Timezone">
              <select
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                value={settings.timezone}
                onChange={(e) => patch({ timezone: e.target.value })}
              >
                {["Asia/Tokyo", "UTC", "America/Los_Angeles", "Europe/London"].map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </Field>
            <Field label="Locale">
              <select
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                value={settings.locale}
                onChange={(e) => {
                  const l = e.target.value as "ja" | "en";
                  patch({ locale: l });
                  setLocale(l);
                }}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label="Env 上書き">
              <input
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                value={settings.environmentOverride}
                onChange={(e) => patch({ environmentOverride: e.target.value })}
              />
            </Field>
            <Field label="データレジデンシー">
              <select
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                value={settings.dataResidency}
                onChange={(e) => patch({ dataResidency: e.target.value as DemoSettings["dataResidency"] })}
              >
                <option value="tokyo">Tokyo</option>
                <option value="eu">EU</option>
                <option value="us">US</option>
              </select>
            </Field>
            <Field label="セッション（分）">
              <input
                type="number"
                min={15}
                value={settings.sessionTimeoutMinutes}
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                onChange={(e) => patch({ sessionTimeoutMinutes: Number(e.target.value) })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.mfaRequired} onChange={(e) => patch({ mfaRequired: e.target.checked })} />
            MFA 必須（stub）
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.changelogDefaultPublic}
              onChange={(e) => patch({ changelogDefaultPublic: e.target.checked })}
            />
            Done Changelog デフォルト公開
          </label>
        </Section>

        <Section title="通知">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {(
              [
                ["notifyIssueDone", "Done"],
                ["notifyRejected", "却下"],
                ["notifyVerification", "未解決"],
                ["notifyAutoTriage", "自動Triage"],
                ["notifyDueSoon", "Due"],
                ["notifyAssignee", "Assignee"],
                ["notifyMention", "@mention"],
                ["notifySla", "SLA"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                />
                <span className="truncate">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="プライバシー">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.maskPrivateHints} onChange={(e) => patch({ maskPrivateHints: e.target.checked })} />
            data-private ヒント
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.saveOriginalScreenshot}
              onChange={(e) => patch({ saveOriginalScreenshot: e.target.checked })}
            />
            オリジナル画像保存
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.autoMaskPii} onChange={(e) => patch({ autoMaskPii: e.target.checked })} />
            PII 自動マスク
          </label>
          <Field label="保持日数">
            <input
              type="number"
              min={7}
              value={settings.retentionDays}
              className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
              onChange={(e) => patch({ retentionDays: Number(e.target.value) })}
            />
          </Field>
        </Section>

        <Section title="エクスポート / インポート">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold" onClick={() => downloadText("shapeit-export.json", exportJson(), "application/json")}>
              JSON
            </button>
            <button type="button" className="rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold" onClick={() => downloadText("shapeit-feedback.csv", exportFeedbackCsv(), "text/csv")}>
              Feedback CSV
            </button>
            <button type="button" className="rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold" onClick={() => downloadText("shapeit-issues.csv", exportIssuesCsv(), "text/csv")}>
              Issues CSV
            </button>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-[10px]"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCsvPreview(parseFeedbackCsv(await file.text()));
            }}
          />
          {csvPreview && (
            <div className="rounded border border-ink/10 bg-paper p-2">
              <p className="font-semibold">プレビュー: {csvPreview.length} 件</p>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  className="rounded bg-mint px-2 py-1 text-[10px] font-semibold text-white"
                  onClick={() => {
                    for (const r of csvPreview) createFeedback({ ...r, source: "CSV_IMPORT" });
                    alert(`${csvPreview.length} 件取り込み`);
                    setCsvPreview(null);
                  }}
                >
                  取り込む
                </button>
                <button type="button" className="rounded border px-2 py-1 text-[10px]" onClick={() => setCsvPreview(null)}>
                  取消
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold"
              onClick={() => {
                if (!window.confirm("匿名化しますか？")) return;
                anonymizeMyData();
                alert("匿名化しました");
              }}
            >
              匿名化
            </button>
            <button
              type="button"
              className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700"
              onClick={() => {
                if (!window.confirm("すべて削除しますか？")) return;
                deleteAllMyData();
                window.location.href = "/login";
              }}
            >
              全削除
            </button>
          </div>
        </Section>

        {mode === "demo" && (
          <Section title="デモデータ">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold"
                onClick={() => {
                  seedIfEmpty();
                  window.location.href = "/inbox";
                }}
              >
                サンプル補充
              </button>
              <button
                type="button"
                className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700"
                onClick={() => {
                  if (!window.confirm("リセットしますか？")) return;
                  resetDemoData();
                  seedIfEmpty();
                  window.location.href = "/capture";
                }}
              >
                リセット
              </button>
            </div>
          </Section>
        )}

        <Section title="Chrome 拡張">
          <p className="text-ink/65">
            {extOk === null ? "確認中…" : extOk ? "接続済み" : "未検出"}
          </p>
          <Link to="/extension/install" className="text-mint hover:underline">手順 →</Link>
        </Section>

        <Section title="Widget">
          <pre className="overflow-x-auto rounded bg-paper p-2 text-[10px] text-ink/70">{`<script src="${window.location.origin}/widget.js" data-app="${window.location.origin}" async></script>`}</pre>
          <a className="text-mint hover:underline" href="/public/changelog">公開 Changelog</a>
        </Section>

        <Section title="接続">
          <ul className="space-y-0.5 text-ink/65">
            <li>LP: {LANDING_URL}</li>
            <li>API: {API_URL || "（未設定）"}</li>
            <li>App: {window.location.origin}</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
