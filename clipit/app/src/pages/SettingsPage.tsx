import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
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
import { PLAN_LIMITS, planLabel, PLAN_PRICE_JPY } from "../lib/plans";
import { countManualsCreatedThisMonth } from "../services/usage";
import type { PlanId } from "../types";

const PLAN_LABELS: Record<string, string> = {
  free: "フリー",
  light: "ライト",
  standard: "スタンダード",
  business: "ビジネス",
};

export default function SettingsPage() {
  const { organization, profile, refresh } = useOrg();
  const { demoMode } = useAuth();
  const [name, setName] = useState(organization?.name ?? "");

  useEffect(() => {
    setName(organization?.name ?? "");
  }, [organization?.name]);
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

  const save = async () => {
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
      <PageHeader title="設定" description="組織名・プラン・プロフィール" />
      <div className="mx-auto max-w-xl space-y-6 p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">組織・施設名</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <button
            type="button"
            disabled={busy || demoMode}
            onClick={save}
            className="mt-4 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            保存
          </button>
          {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">ロゴ（PDF・共有に表示予定）</h2>
          {organization?.logoUrl && (
            <img src={organization.logoUrl} alt="" className="mt-3 h-12 object-contain" />
          )}
          <input
            type="file"
            accept="image/*"
            disabled={demoMode || logoBusy}
            className="mt-3 block w-full text-sm text-slate-600"
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
          <p className="mt-2 text-xs text-slate-500">2MB以下の PNG / JPG / WebP</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">用語辞書（話して作成・AI整形）</h2>
          <p className="mt-2 text-xs text-slate-500">
            1行1語。音声認識の誤変換を補正し、社内固有名詞を正しく残します。未設定時はデフォルト（{DEFAULT_TERM_GLOSSARY.length}語）を使用。
          </p>
          <textarea
            value={glossaryText}
            onChange={(e) => setGlossaryText(e.target.value)}
            rows={8}
            disabled={demoMode}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm"
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
            className="mt-4 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            用語辞書を保存
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">変数（{'{{キー}}'} 形式）</h2>
          <p className="mt-2 text-xs text-slate-500">
            1行1項目（キー=値）。問い合わせ先や会社名を変えると、マニュアル内の変数が一括で反映されます。
          </p>
          <textarea
            value={variablesText}
            onChange={(e) => setVariablesText(e.target.value)}
            rows={6}
            disabled={demoMode}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">共通パーツ</h2>
          <p className="mt-2 text-xs text-slate-500">
            マニュアルに {'{{snippet:contact}}'} のように埋め込めます。1回直せば全マニュアルに反映。
          </p>
          <div className="mt-3 space-y-3">
            {snippets.map((s, i) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-3">
                <input
                  value={s.name}
                  onChange={(e) =>
                    setSnippets((cur) => cur.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                />
                <p className="mt-1 text-[10px] text-slate-400">ID: {s.id}</p>
                <textarea
                  value={s.body}
                  onChange={(e) =>
                    setSnippets((cur) => cur.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))
                  }
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">ルールブック（社内の書き方ルール）</h2>
          <p className="mt-2 text-xs text-slate-500">AI一括更新・文体統一の参照。1行1ルール。</p>
          <textarea
            value={rulebook}
            onChange={(e) => setRulebook(e.target.value)}
            rows={6}
            placeholder={"患者さんという表記を使う（お客様とは書かない）\n個人情報が映るスクショは必ず黒塗りする"}
            disabled={demoMode}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
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
            className="mt-4 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            変数・共通パーツを保存
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">プラン</h2>
          <p className="mt-2 text-2xl font-bold text-primary-600">
            {PLAN_LABELS[organization?.plan ?? "free"] ?? organization?.plan}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            月額 {PLAN_PRICE_JPY[(organization?.plan ?? "free") as PlanId].toLocaleString("ja-JP")}円
            （税込表示は Stripe 連携時に統一）
          </p>
          {manualsThisMonth !== null && organization && (
            <p className="mt-3 text-sm text-slate-600">
              今月のマニュアル作成:{" "}
              <span className="font-semibold">
                {manualsThisMonth} / {PLAN_LIMITS[organization.plan as PlanId].manualsPerMonth}
              </span>
              本（{planLabel(organization.plan as PlanId)}）
            </p>
          )}
          <p className="mt-2 text-sm text-slate-500">Stripe 課金連携は今後追加予定です。</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">ログインユーザー:</span> {profile?.name}（{profile?.email}）
          </p>
          <p className="mt-1">
            <span className="font-semibold text-slate-800">権限:</span> {profile?.role}
          </p>
        </section>
      </div>
    </>
  );
}
