import { useEffect, useState } from "react";
import {
  listWebhookLogs,
  loadWebhookConfig,
  saveWebhookConfig,
  type WebhookConfig,
} from "../lib/webhooks";
import { loadFlags, saveFlags, type FeatureFlags } from "../lib/featureFlags";
import { loadSettings, saveSettings, ensurePortalToken } from "../lib/demoStore";
import { canManageSettings } from "../lib/roles";
import { t } from "../lib/i18n";
import { createProjectKey, listProjectKeys, revokeProjectKey } from "../lib/projectKeys";
import { addMaskRule, deleteMaskRule, listMaskRules } from "../lib/maskRules";
import { entitlements, loadBilling, saveBilling, type PlanId } from "../lib/billing";
import { loadAiBudget, saveAiBudget } from "../lib/aiBudget";
import { planAllows } from "../lib/billing";
import { listEmailJobs } from "../lib/emailQueue";
import { loadOrgIntegrations, saveOrgIntegrations, type OrgIntegrations } from "../lib/orgSettings";
import { useAuth } from "../components/AuthProvider";
import { publishWeeklyDigestRemote } from "../lib/weeklyDigestRunner";

export default function IntegrationsPage() {
  const { mode } = useAuth();
  const [cfg, setCfg] = useState(() => loadWebhookConfig());
  const [flags, setFlags] = useState(() => loadFlags());
  const [repo, setRepo] = useState(() => loadSettings().githubRepo);
  const [portal, setPortal] = useState(() => ensurePortalToken());
  const [keys, setKeys] = useState(() => listProjectKeys());
  const [rules, setRules] = useState(() => listMaskRules());
  const [billing, setBilling] = useState(() => loadBilling());
  const [budget, setBudget] = useState(() => loadAiBudget());
  const [integrations, setIntegrations] = useState<OrgIntegrations | null>(null);
  const [digestMsg, setDigestMsg] = useState("");
  const [ruleForm, setRuleForm] = useState({ pagePattern: "", selector: "", note: "" });
  const logs = listWebhookLogs();
  const emails = listEmailJobs();
  const allowed = canManageSettings();
  const ent = entitlements(billing.plan);

  useEffect(() => {
    void loadOrgIntegrations().then((i) => {
      setIntegrations(i);
      setCfg(
        saveWebhookConfig({
          enabled: i.outboundWebhookEnabled,
          url: i.outboundWebhookUrl,
          secret: i.outboundWebhookSecret,
          events: i.outboundWebhookEvents,
        }),
      );
    });
  }, [mode]);

  if (!integrations) {
    return <p className="text-sm text-ink/50">読み込み中…</p>;
  }

  const slack = integrations.slackWebhookUrl;
  const teams = integrations.teamsWebhookUrl;

  if (!allowed) {
    return <p className="text-sm text-ink/60">連携の設定は管理者のみできます。</p>;
  }

  const patchCfg = (p: Partial<WebhookConfig>) => {
    const next = saveWebhookConfig(p);
    setCfg(next);
    void saveOrgIntegrations({
      outboundWebhookEnabled: next.enabled,
      outboundWebhookUrl: next.url,
      outboundWebhookSecret: next.secret,
      outboundWebhookEvents: next.events,
    }).then(setIntegrations);
  };
  const patchFlags = (p: Partial<FeatureFlags>) => setFlags(saveFlags(p));
  const portalUrl = `${window.location.origin}/portal/${portal}`;

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_integrations")}</p>
        <h1 className="font-display mt-1 text-3xl font-bold">{t("page_integrations")}</h1>
      </div>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">Plan / Entitlements（BILL）</h2>
        <select
          className="mt-3 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
          value={billing.plan}
          onChange={(e) => {
            const plan = e.target.value as PlanId;
            setBilling(saveBilling({ plan }));
            saveAiBudget({ monthlyLimitUsd: entitlements(plan).aiBudget });
            setBudget(loadAiBudget());
          }}
        >
          <option value="free">Free</option>
          <option value="team">Team</option>
          <option value="scale">Scale</option>
        </select>
        <p className="mt-2 text-xs text-ink/50">
          {ent.label} · AI ${ent.aiBudget}/mo · Webhooks {ent.webhooks ? "ON" : "OFF"} · Projects{" "}
          {ent.maxProjects}
        </p>
        <p className="mt-1 text-xs text-ink/45">
          AI 予算: ${budget.usedUsd.toFixed(3)} / ${budget.monthlyLimitUsd}
        </p>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">Project API Key（API-003）</h2>
        <button
          type="button"
          className="mt-3 rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
          onClick={() => {
            createProjectKey("widget");
            setKeys(listProjectKeys());
          }}
        >
          キーを発行
        </button>
        <ul className="mt-3 space-y-2 text-xs">
          {keys.map((k) => (
            <li key={k.id} className="rounded-lg bg-paper px-3 py-2">
              <p className="font-medium">{k.name}</p>
              <p className="break-all text-ink/60">{k.enabled ? k.key : "(revoked)"}</p>
              {k.enabled && (
                <button
                  type="button"
                  className="mt-1 text-red-700"
                  onClick={() => {
                    revokeProjectKey(k.id);
                    setKeys(listProjectKeys());
                  }}
                >
                  無効化
                </button>
              )}
            </li>
          ))}
        </ul>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-paper p-2 text-[10px] text-ink/60">{`curl -X POST $API/v1/public/feedback \\
  -H "X-ShapeIt-Key: pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"rawText":"button unclear","pageUrl":"https://..."}'`}</pre>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">Outbound Webhook（CH-001）</h2>
        {!planAllows("webhooks") && (
          <p className="mt-2 text-xs text-amber-800">現在の Plan では Webhook が無効です。Team 以上へ。</p>
        )}
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={cfg.enabled}
            disabled={!planAllows("webhooks")}
            onChange={(e) => patchCfg({ enabled: e.target.checked })}
          />
          有効にする
        </label>
        <label className="mt-3 block text-xs">
          URL（空ならログのみ）
          <input
            className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
            value={cfg.url}
            onChange={(e) => patchCfg({ url: e.target.value })}
          />
        </label>
        <label className="mt-3 block text-xs">
          Secret（HMAC）
          <input
            className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
            value={cfg.secret}
            onChange={(e) => patchCfg({ secret: e.target.value })}
          />
        </label>
        <div className="mt-3 grid gap-1 text-xs">
          {(Object.keys(cfg.events) as (keyof WebhookConfig["events"])[]).map((ev) => (
            <label key={ev} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cfg.events[ev]}
                onChange={(e) => patchCfg({ events: { ...cfg.events, [ev]: e.target.checked } })}
              />
              {ev}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink/45">
          クラウドでは org 設定に同期。週次サマリーは <code>weekly_digest</code> イベント。
        </p>
        <h3 className="mt-4 text-xs font-semibold text-ink/50">直近ログ</h3>
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-ink/60">
          {logs.length === 0 && <li>なし</li>}
          {logs.slice(0, 10).map((l) => (
            <li key={l.id}>
              {l.at.slice(11, 19)} · {l.event} · {l.ok ? "ok" : "fail"}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">週次改善サマリー（Digest + Slack）</h2>
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={integrations.weeklyDigestEnabled}
            onChange={(e) =>
              void saveOrgIntegrations({ weeklyDigestEnabled: e.target.checked }).then(setIntegrations)
            }
          />
          週次サマリーを有効（毎週月曜 9:00 JST に自動配信）
        </label>
        {integrations.lastWeeklyDigestAtIso && (
          <p className="mt-2 text-xs text-ink/50">
            最終配信: {integrations.lastWeeklyDigestAtIso.slice(0, 16).replace("T", " ")}（
            {integrations.lastWeeklyDigestWeekKey ?? "—"}）
          </p>
        )}
        <button
          type="button"
          className="mt-3 rounded-lg border border-mint/30 bg-mint/5 px-3 py-2 text-xs font-semibold text-mint"
          onClick={() =>
            void publishWeeklyDigestRemote(true).then((r) =>
              setDigestMsg(
                r.published
                  ? `配信しました（Slack ${r.slackSent ? "OK" : "未送信"}）`
                  : "今週は配信済みです",
              ),
            )
          }
        >
          今すぐテスト配信
        </button>
        {digestMsg && <p className="mt-2 text-xs text-ink/55">{digestMsg}</p>}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">Slack Incoming Webhook</h2>
        <input
          className="mt-3 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
          placeholder="https://hooks.slack.com/services/..."
          value={slack}
          onChange={(e) =>
            void saveOrgIntegrations({ slackWebhookUrl: e.target.value }).then(setIntegrations)
          }
        />
        <p className="mt-2 text-xs text-ink/50">
          週次サマリーを Slack に投稿します。Issue Done の個別通知は今後の拡張用。
        </p>
        <h3 className="mt-4 font-semibold">Teams Incoming Webhook</h3>
        <input
          className="mt-2 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
          placeholder="https://outlook.office.com/webhook/..."
          value={teams}
          onChange={(e) =>
            void saveOrgIntegrations({ teamsWebhookUrl: e.target.value }).then(setIntegrations)
          }
        />
        <h3 className="mt-4 text-xs font-semibold text-ink/50">Email キュー（NOT-002 stub）</h3>
        <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px] text-ink/60">
          {emails.length === 0 && <li>なし</li>}
          {emails.slice(0, 8).map((e) => (
            <li key={e.id}>
              {e.createdAt.slice(11, 19)} · {e.event} · {e.subject}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">常時マスクルール（PRV-005）</h2>
        <div className="mt-3 grid gap-2">
          <input
            className="rounded-lg border border-ink/10 px-2 py-2 text-xs"
            placeholder="page URL regex (optional)"
            value={ruleForm.pagePattern}
            onChange={(e) => setRuleForm({ ...ruleForm, pagePattern: e.target.value })}
          />
          <input
            className="rounded-lg border border-ink/10 px-2 py-2 text-xs"
            placeholder="CSS selector e.g. .pii, [data-ssn]"
            value={ruleForm.selector}
            onChange={(e) => setRuleForm({ ...ruleForm, selector: e.target.value })}
          />
          <input
            className="rounded-lg border border-ink/10 px-2 py-2 text-xs"
            placeholder="note"
            value={ruleForm.note}
            onChange={(e) => setRuleForm({ ...ruleForm, note: e.target.value })}
          />
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={() => {
              if (!ruleForm.selector.trim()) return;
              addMaskRule(ruleForm);
              setRules(listMaskRules());
              setRuleForm({ pagePattern: "", selector: "", note: "" });
            }}
          >
            ルール追加
          </button>
        </div>
        <ul className="mt-3 space-y-1 text-xs">
          {rules.map((r) => (
            <li key={r.id} className="flex justify-between gap-2 rounded bg-paper px-2 py-1.5">
              <span>
                {r.selector} {r.pagePattern ? `(${r.pagePattern})` : ""}
              </span>
              <button type="button" onClick={() => { deleteMaskRule(r.id); setRules(listMaskRules()); }}>
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">GitHub（DEV-001）</h2>
        <input
          className="mt-3 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
          value={repo}
          placeholder="acme/product"
          onChange={(e) => {
            setRepo(e.target.value);
            saveSettings({ githubRepo: e.target.value });
          }}
        />
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">Customer Portal（CL-003）</h2>
        <p className="mt-2 break-all text-xs text-ink/65">{portalUrl}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={() => void navigator.clipboard.writeText(portalUrl)}
          >
            URL をコピー
          </button>
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={() => {
              const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
              saveSettings({ portalToken: token });
              setPortal(token);
            }}
          >
            トークン再発行
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <h2 className="font-semibold">Feature Flags</h2>
        {(
          [
            ["ideas", "Ideas"],
            ["roadmap", "Roadmap"],
            ["digest", "Digest"],
            ["insights", "Insights"],
            ["ranking", "ICE Ranking"],
            ["customerPortal", "Customer Portal"],
            ["webhooks", "Webhooks"],
            ["autoMergeAssist", "自動統合補助"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={flags[key]}
              onChange={(e) => patchFlags({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </section>
    </div>
  );
}
