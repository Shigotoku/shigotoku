import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import SettingsCollapsible from "../components/SettingsCollapsible";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import {
  updateOrganizationName,
  updateOrganizationLogo,
  updateOrganizationGlossary,
  updateOrganizationContent,
} from "../services/bootstrap";
import { DEFAULT_TERM_GLOSSARY, formatGlossaryLines, parseGlossaryText } from "../lib/termGlossary";
import {
  DEFAULT_SNIPPETS,
  DEFAULT_VARIABLES,
  formatVariablesText,
  parseVariablesText,
  type OrgSnippet,
} from "../lib/orgContent";
import { uploadOrganizationLogo } from "../lib/uploadLogo";
import { effectivePlanId, hasFullAccess } from "../lib/internalAccess";
import { PLAN_LIMITS, planLabel, PLAN_PRICE_JPY } from "../lib/plans";
import { countManualsCreatedThisMonth } from "../services/usage";
import type { PlanId } from "../types";

const PLAN_LABELS: Record<string, string> = {
  free: "フリー",
  light: "ライト",
  standard: "スタンダード",
  business: "ビジネス",
  developer: "開発者",
  agency: "代理店",
};

export default function SettingsPage() {
  const { organization, profile, refresh } = useOrg();
  const { user, demoMode } = useAuth();
  const [name, setName] = useState(organization?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [manualsThisMonth, setManualsThisMonth] = useState<number | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [glossaryText, setGlossaryText] = useState(formatGlossaryLines(organization?.termGlossary));
  const [glossaryBusy, setGlossaryBusy] = useState(false);
  const [variablesText, setVariablesText] = useState(
    formatVariablesText(organization?.orgVariables ?? DEFAULT_VARIABLES),
  );
  const [snippets, setSnippets] = useState<OrgSnippet[]>(organization?.snippets ?? DEFAULT_SNIPPETS);
  const [rulebook, setRulebook] = useState(organization?.rulebook ?? "");
  const [contentBusy, setContentBusy] = useState(false);

  const planId = organization
    ? effectivePlanId(organization.plan as PlanId, user?.email)
    : ("free" as PlanId);

  useEffect(() => {
    setName(organization?.name ?? "");
  }, [organization?.name]);

  useEffect(() => {
    setGlossaryText(formatGlossaryLines(organization?.termGlossary));
    setVariablesText(formatVariablesText(organization?.orgVariables ?? DEFAULT_VARIABLES));
    setSnippets(organization?.snippets ?? DEFAULT_SNIPPETS);
    setRulebook(organization?.rulebook ?? "");
  }, [organization?.termGlossary, organization?.orgVariables, organization?.snippets, organization?.rulebook]);

  useEffect(() => {
    if (!organization?.id || demoMode) return;
    countManualsCreatedThisMonth(organization.id)
      .then(setManualsThisMonth)
      .catch(() => setManualsThisMonth(null));
  }, [organization?.id, demoMode]);

  const saveName = async () => {
    if (!organization || demoMode) return;
    setBusy(true);
    setMsg("");
    try {
      await updateOrganizationName(organization.id, name);
      await refresh();
      setMsg("保存しました");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="設定" description="組織・プラン・AI用の辞書と変数" />
      <div className="space-y-3 p-4 sm:p-6">
        {msg && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{msg}</p>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <SettingsCollapsible title="組織・施設名" summary={name || "未設定"} defaultOpen>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || demoMode}
              onClick={() => void saveName()}
              className="mt-3 rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              保存
            </button>
          </SettingsCollapsible>

          <SettingsCollapsible
            title="プラン"
            summary={`${PLAN_LABELS[planId] ?? planId} · 今月 ${manualsThisMonth ?? "—"} / ${PLAN_LIMITS[planId].manualsPerMonth} 本`}
            defaultOpen
          >
            <p className="text-lg font-bold text-primary-600">{PLAN_LABELS[planId] ?? planId}</p>
            <p className="mt-1 text-xs text-slate-500">
              月額 {PLAN_PRICE_JPY[planId].toLocaleString("ja-JP")}円（Stripe 連携時に統一）
            </p>
            {hasFullAccess(user?.email) && (
              <p className="mt-2 text-xs font-semibold text-success-700">運用アカウント: 全機能利用可</p>
            )}
            {manualsThisMonth !== null && organization && (
              <p className="mt-2 text-sm text-slate-600">
                今月の作成: {manualsThisMonth} / {PLAN_LIMITS[planId].manualsPerMonth} 本（{planLabel(planId)}）
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">Stripe 課金連携は今後追加予定です。</p>
          </SettingsCollapsible>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <SettingsCollapsible title="ログインユーザー" summary={profile?.email ?? ""} defaultOpen>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{profile?.name}</span>（{profile?.email}）
            </p>
            <p className="mt-1 text-xs text-slate-500">権限: {profile?.role}</p>
          </SettingsCollapsible>

          <SettingsCollapsible title="ロゴ" summary={organization?.logoUrl ? "設定済み" : "未設定"}>
            {organization?.logoUrl && (
              <img src={organization.logoUrl} alt="" className="h-10 object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              disabled={demoMode || logoBusy}
              className="mt-2 block w-full text-xs text-slate-600"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !organization) return;
                setLogoBusy(true);
                setMsg("");
                try {
                  const url = await uploadOrganizationLogo(organization.id, file);
                  await updateOrganizationLogo(organization.id, url);
                  await refresh();
                  setMsg("ロゴを保存しました");
                } catch (err) {
                  setMsg((err as Error).message);
                } finally {
                  setLogoBusy(false);
                }
              }}
            />
            <p className="mt-1 text-[10px] text-slate-400">2MB以下 PNG / JPG / WebP</p>
          </SettingsCollapsible>
        </div>

        <SettingsCollapsible
          title="用語辞書（話して作成・AI整形）"
          summary={`${parseGlossaryText(glossaryText).length || DEFAULT_TERM_GLOSSARY.length} 語`}
        >
          <p className="mb-2 text-[11px] text-slate-500">1行1語。未設定時はデフォルト辞書を使用。</p>
          <textarea
            value={glossaryText}
            onChange={(e) => setGlossaryText(e.target.value)}
            rows={5}
            disabled={demoMode}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            disabled={glossaryBusy || demoMode || !organization}
            onClick={async () => {
              if (!organization) return;
              setGlossaryBusy(true);
              setMsg("");
              try {
                await updateOrganizationGlossary(organization.id, parseGlossaryText(glossaryText));
                await refresh();
                setMsg("用語辞書を保存しました");
              } catch (e) {
                setMsg((e as Error).message);
              } finally {
                setGlossaryBusy(false);
              }
            }}
            className="mt-2 rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            用語辞書を保存
          </button>
        </SettingsCollapsible>

        <SettingsCollapsible
          title="変数・共通パーツ・ルールブック"
          summary="まとめて修正・AI整形の参照データ"
        >
          <p className="mb-2 text-[11px] text-slate-500">
            変数は <code className="rounded bg-slate-100 px-1">{'{{キー}}'}</code> 形式。共通パーツは{" "}
            <code className="rounded bg-slate-100 px-1">{'{{snippet:id}}'}</code>
          </p>
          <label className="text-xs font-semibold text-slate-700">変数</label>
          <textarea
            value={variablesText}
            onChange={(e) => setVariablesText(e.target.value)}
            rows={4}
            disabled={demoMode}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
          />
          <label className="mt-3 block text-xs font-semibold text-slate-700">ルールブック</label>
          <textarea
            value={rulebook}
            onChange={(e) => setRulebook(e.target.value)}
            rows={3}
            placeholder="患者さんという表記を使う"
            disabled={demoMode}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
          <p className="mt-3 text-xs font-semibold text-slate-700">共通パーツ（{snippets.length}件）</p>
          <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {snippets.map((s, i) => (
              <div key={s.id} className="rounded-lg border border-slate-200 p-2">
                <input
                  value={s.name}
                  onChange={(e) =>
                    setSnippets((cur) => cur.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold"
                />
                <textarea
                  value={s.body}
                  onChange={(e) =>
                    setSnippets((cur) => cur.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))
                  }
                  rows={2}
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={contentBusy || demoMode || !organization}
            onClick={async () => {
              if (!organization) return;
              setContentBusy(true);
              setMsg("");
              try {
                await updateOrganizationContent(organization.id, {
                  orgVariables: parseVariablesText(variablesText),
                  snippets,
                  rulebook,
                });
                await refresh();
                setMsg("変数・共通パーツ・ルールブックを保存しました");
              } catch (e) {
                setMsg((e as Error).message);
              } finally {
                setContentBusy(false);
              }
            }}
            className="mt-3 rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            一括保存
          </button>
        </SettingsCollapsible>
      </div>
    </>
  );
}
