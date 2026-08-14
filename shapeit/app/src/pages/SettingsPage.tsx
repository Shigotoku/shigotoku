import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { LANDING_URL, API_URL } from "../lib/urls";
import { pingExtension, publishAuthToExtension } from "../lib/extensionBridge";
import { APP_VERSION, detectEnvironment } from "../lib/meta";
import {
  authProviderLabels,
  formatAuthError,
  hasGoogleLinked,
  linkGoogleToCurrentUser,
} from "../lib/firebase";
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
import { setLocale, t } from "../lib/i18n";
import { ExtensionGuidePanel } from "../components/ExtensionGuidePanel";
import { useLocale } from "../lib/useLocale";
import {
  fetchMyMemberProfile,
  fetchOrgProfile,
  inviteOrgMemberByEmail,
  inviteUrl,
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
import { InviteLinkShare } from "../components/InviteLinkShare";
import SettingsSubnav from "../components/SettingsSubnav";

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
  const locale = useLocale();
  const [params] = useSearchParams();
  const tab = params.get("tab") || "org";
  const [extOk, setExtOk] = useState<boolean | null>(null);
  const [extMsg, setExtMsg] = useState("");
  const [linkGoogleBusy, setLinkGoogleBusy] = useState(false);
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
  const [lastInviteLink, setLastInviteLink] = useState<{ url: string; email: string } | null>(null);

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
          <h1 className="font-display text-2xl font-bold">{t("settings", locale)}</h1>
        </div>
        <p className="text-[10px] text-ink/45">
          App {APP_VERSION} · env {settings.environmentOverride || detectEnvironment()}
        </p>
      </div>

      <SettingsSubnav />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {tab === "org" && (
          <>
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
          </div>
        </Section>

        <Section title={locale === "ja" ? "アカウント" : "Account"}>
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
          </>
        )}

        {tab === "members" && (
        <Section title={t("org_members", locale)} className="xl:col-span-2">
          {mode === "google" ? (
            <>
              {isOrgAdmin && (
                <>
                  <p className="text-[10px] leading-relaxed text-ink/55">{t("org_invite_hint", locale)}</p>
                  <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded border border-ink/10 px-2 py-1.5 text-sm"
                    placeholder="member@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded bg-mint px-3 py-1.5 text-[11px] font-semibold text-white"
                    onClick={() => {
                      if (!inviteEmail.trim()) return;
                      const targetEmail = inviteEmail.trim();
                      setInviteMsg("");
                      void inviteOrgMemberByEmail(targetEmail, "member", companyName)
                        .then((result) => {
                          setInviteEmail("");
                          if (result.inviteUrl) {
                            setLastInviteLink({ url: result.inviteUrl, email: targetEmail });
                          }
                          setInviteMsg(t("org_invite_created", locale));
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
                {lastInviteLink && (
                  <InviteLinkShare
                    url={lastInviteLink.url}
                    email={lastInviteLink.email}
                    locale={locale}
                  />
                )}
                </>
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
                    <span className="flex shrink-0 gap-1">
                      {inv.token && (
                        <button
                          type="button"
                          className="text-[10px] font-medium text-mint hover:underline"
                          onClick={() => {
                            setLastInviteLink({ url: inviteUrl(inv.token!), email: inv.email });
                            setInviteMsg(t("org_link_copied", locale));
                            void navigator.clipboard.writeText(inviteUrl(inv.token!));
                          }}
                        >
                          {t("org_copy_link", locale)}
                        </button>
                      )}
                      {isOrgAdmin && (
                        <button
                          type="button"
                          className="shrink-0"
                          onClick={() => void removeOrgInvite(inv.id).then(() => refreshCloudMembers())}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {inviteMsg && <p className="text-[10px] text-mint">{inviteMsg}</p>}
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
        )}

        {tab === "notify" && (
        <Section title={locale === "ja" ? "自動トリアージ" : "Auto triage"}>
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
        )}

        {tab === "language" && (
        <Section title={t("settings_tab_language", locale)}>
          <div className="grid grid-cols-2 gap-2">
            <Field label={locale === "ja" ? "タイムゾーン" : "Timezone"}>
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
            <Field label={locale === "ja" ? "言語" : "Language"}>
              <select
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                value={locale}
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
            <Field label={locale === "ja" ? "環境の上書き" : "Env override"}>
              <input
                className="w-full rounded border border-ink/10 px-2 py-1 text-sm"
                value={settings.environmentOverride}
                onChange={(e) => patch({ environmentOverride: e.target.value })}
              />
            </Field>
            <Field label={locale === "ja" ? "データの保管地域" : "Data residency"}>
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
            <Field label={locale === "ja" ? "セッション（分）" : "Session (min)"}>
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
        )}

        {tab === "notify" && (
        <Section title={t("settings_tab_notify", locale)}>
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
        )}

        {tab === "privacy" && (
        <Section title={t("settings_tab_privacy", locale)}>
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
        )}

        {tab === "data" && (
          <>
        <Section title={locale === "ja" ? "エクスポート / インポート" : "Export / import"}>
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
          </>
        )}

        {tab === "extension" && (
          <>
        <Section title={t("ext_account_title", locale)}>
          <p className="text-[10px] leading-relaxed text-ink/55">{t("ext_account_hint", locale)}</p>
          {user?.email ? (
            <p className="text-ink/80">
              {t("ext_account_current", locale)}: <strong>{user.email}</strong>
            </p>
          ) : (
            <p className="text-ink/55">{locale === "ja" ? "ログイン情報を読み込み中…" : "Loading sign-in…"}</p>
          )}
          <p className="text-[10px] text-ink/55">
            {t("ext_account_providers", locale)}: {authProviderLabels(user).join(" / ")}
          </p>
          {mode === "google" && user && !hasGoogleLinked(user) && (
            <>
              <p className="text-[10px] leading-relaxed text-ink/55">{t("ext_link_google_hint", locale)}</p>
              <button
                type="button"
                disabled={linkGoogleBusy}
                className="rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold text-ink/80 disabled:opacity-50"
                onClick={() => {
                  void (async () => {
                    setLinkGoogleBusy(true);
                    setExtMsg("");
                    try {
                      await linkGoogleToCurrentUser();
                      await publishAuthToExtension();
                      setExtMsg(locale === "ja" ? "Google を連携しました" : "Google linked");
                    } catch (err) {
                      setExtMsg(formatAuthError(err));
                    } finally {
                      setLinkGoogleBusy(false);
                    }
                  })();
                }}
              >
                {linkGoogleBusy ? (locale === "ja" ? "連携中…" : "Linking…") : t("ext_link_google", locale)}
              </button>
            </>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded border border-mint/40 px-2 py-1 text-[11px] font-semibold text-mint"
              onClick={() => {
                void (async () => {
                  await publishAuthToExtension();
                  const ok = await pingExtension();
                  setExtOk(ok);
                  setExtMsg(t("ext_resync_done", locale));
                })();
              }}
            >
              {t("ext_resync", locale)}
            </button>
            <a
              href={`${LANDING_URL}guide/#account-basics`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-mint hover:underline"
            >
              {locale === "ja" ? "アカウントと拡張のガイド →" : "Account & extension guide →"}
            </a>
          </div>
          {extMsg ? <p className="text-[10px] text-ink/70">{extMsg}</p> : null}
        </Section>

        <Section title={t("nav_extension", locale)}>
          <p className="text-ink/65">
            {extOk === null ? (locale === "ja" ? "確認中…" : "Checking…") : extOk ? (locale === "ja" ? "接続済み。SaaS画面から拡張で投稿できます。" : "Connected. You can report from SaaS pages.") : (locale === "ja" ? "未検出。下の手順からインストールしてください。" : "Not detected. Install from the steps below.")}
          </p>
          <p className="text-[10px] leading-relaxed text-ink/55">{t("google_recommend", locale)}</p>
          <Link to="/extension/install" className="text-mint hover:underline">
            {locale === "ja" ? "インストール手順 →" : "Install steps →"}
          </Link>
        </Section>

        <Section title={locale === "ja" ? "拡張の使い方（v0.4.1）" : "Extension guide (v0.4.1)"} className="xl:col-span-2">
          <ExtensionGuidePanel showInstall={false} />
        </Section>

        <Section title="Widget">
          <pre className="overflow-x-auto rounded bg-paper p-2 text-[10px] text-ink/70">{`<script src="${window.location.origin}/widget.js" data-app="${window.location.origin}" async></script>`}</pre>
          <a className="text-mint hover:underline" href="/public/changelog">{locale === "ja" ? "公開変更履歴" : "Public changelog"}</a>
        </Section>

        <Section title={locale === "ja" ? "接続" : "Connections"}>
          <ul className="space-y-0.5 text-ink/65">
            <li>LP: {LANDING_URL}</li>
            <li>API: {API_URL || "（未設定）"}</li>
            <li>App: {window.location.origin}</li>
          </ul>
        </Section>
          </>
        )}

        {tab === "admin" && (
          <Section title={t("settings_tab_admin", locale)} className="xl:col-span-3">
            <p className="text-[10px] text-ink/55">
              {locale === "ja" ? "管理用の画面です。項目を選ぶとそれぞれのページが開きます。" : "Admin screens. Choose an item to open its page."}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { to: "/onboarding", key: "nav_setup" },
                { to: "/extension/install", key: "nav_extension" },
                { to: "/integrations", key: "nav_integrations" },
                { to: "/audit", key: "nav_audit" },
                { to: "/golden", key: "nav_golden" },
                { to: "/legal", key: "nav_legal" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg border border-ink/10 bg-paper px-3 py-3 text-sm font-semibold text-ink hover:border-mint/40 hover:bg-mint/5"
                >
                  {t(item.key, locale)}
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
