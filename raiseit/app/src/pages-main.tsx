import { useState } from "react";
import { Link } from "react-router-dom";
import type { Action } from "./lib";
import { Bars, Card, Delta, useData } from "./ui";

const RISK = { low: "低", mid: "中", high: "高" } as const;
const RISK_CLS = { low: "bg-emerald-50 text-emerald-700", mid: "bg-amber-50 text-amber-700", high: "bg-rose-50 text-rose-700" } as const;
const STATUS_LABEL: Record<string, string> = { open: "未対応", approved: "承認済み(実施待ち)", done: "実施済み", skipped: "見送り" };

function Chip({ children, cls = "bg-slate-100 text-slate-600" }: { children: React.ReactNode; cls?: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{children}</span>;
}

export function ActionCard({ a, compact = false }: { a: Action; compact?: boolean }) {
  const { state, setStatus, role } = useData();
  const [open, setOpen] = useState(!compact);
  const st = state[a.id]?.status ?? "open";
  const writable = ["owner", "admin", "editor"].includes(role);
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Chip cls="bg-ink text-white">{a.category}</Chip>
        <Chip>確度 {a.confidenceLabel}</Chip>
        <Chip>所要 約{a.effortMin}分</Chip>
        <Chip cls={RISK_CLS[a.risk]}>リスク {RISK[a.risk]}</Chip>
        {st !== "open" && <Chip cls="bg-mint/10 text-mint">{STATUS_LABEL[st]}</Chip>}
      </div>
      <div className="font-semibold leading-snug">{a.title}</div>
      <div className="text-sm text-slate-600">期待効果:{a.impact.label}</div>
      <button className="text-xs text-mint underline" onClick={() => setOpen(!open)}>{open ? "理由と手順を閉じる" : "理由と手順を見る"}</button>
      {open && (
        <div className="text-sm space-y-2">
          <div>
            <div className="font-semibold text-xs text-slate-500">なぜ</div>
            <ul className="list-disc pl-5">{a.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
          <div>
            <div className="font-semibold text-xs text-slate-500">やること</div>
            <ul className="list-disc pl-5">{a.how.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
          <div className="text-xs text-slate-400">根拠:{a.impact.basis}</div>
          {a.risk !== "low" && <div className="text-xs text-amber-700">本文・見出しを変える施策です。医療広告の確認(文案チェック)のうえ、人が最終確認してください。</div>}
        </div>
      )}
      {writable && (
        <div className="flex gap-2 pt-1">
          {st === "open" && (
            <>
              <button onClick={() => setStatus(a, "approved")} className="flex-1 rounded-lg bg-ink text-white py-2.5 text-sm font-semibold">承認する</button>
              <button onClick={() => setStatus(a, "skipped")} className="rounded-lg border px-4 py-2.5 text-sm">見送り</button>
            </>
          )}
          {st === "approved" && (
            <>
              <button onClick={() => setStatus(a, "done")} className="flex-1 rounded-lg bg-mint text-white py-2.5 text-sm font-semibold">実施した(効果測定を開始)</button>
              <button onClick={() => setStatus(a, "open")} className="rounded-lg border px-4 py-2.5 text-sm">戻す</button>
            </>
          )}
          {(st === "done" || st === "skipped") && <button onClick={() => setStatus(a, "open")} className="rounded-lg border px-4 py-2.5 text-sm">未対応に戻す</button>}
        </div>
      )}
    </Card>
  );
}

export function Home() {
  const { summary: s, state, loading } = useData();
  if (loading && !s) return <p className="text-slate-500">読み込み中…</p>;
  if (!s) return null;
  const week = s.thisWeek.map((id) => s.actions.find((a) => a.id === id)).filter((a): a is Action => !!a && (state[a.id]?.status ?? "open") !== "skipped");
  const n = s.northStar;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{s.site.name} の今月の結論</h1>
        <p className="text-xs text-slate-500">{s.period.from} 〜 {s.period.to}(直近{s.period.days}日)</p>
      </div>

      <Card>
        <div className="text-sm text-slate-500">{n.label}(最重要の成果指標)</div>
        <div className="flex items-end gap-3">
          <div className="text-5xl font-bold">{n.cur}<span className="text-lg font-normal">件</span></div>
          <Delta cur={n.cur} prev={n.prev} unit="件" />
        </div>
        <div className="mt-3">
          <Bars values={n.weekly.map((w) => w.leads)} labels={n.weekly.map((w) => `${w.from}〜${w.to}`)} />
          <div className="text-[10px] text-slate-400 mt-1">週ごとの推移(直近12週)</div>
        </div>
        <p className="text-xs text-slate-400 mt-2">{n.note}</p>
      </Card>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card><div className="text-[11px] text-slate-500">検索クリック</div><div className="text-xl font-bold">{s.seo.clicks.toLocaleString()}</div><Delta cur={s.seo.clicks} prev={s.seo.prev.clicks} /></Card>
        <Card><div className="text-[11px] text-slate-500">セッション</div><div className="text-xl font-bold">{s.funnel.sessions.toLocaleString()}</div><Delta cur={s.funnel.sessions} prev={s.funnel.sessionsPrev} /></Card>
        <Card><div className="text-[11px] text-slate-500">AI経由</div><div className="text-xl font-bold">{s.ai.sessions}</div><Delta cur={s.ai.sessions} prev={s.ai.prev} /></Card>
      </div>

      <div>
        <h2 className="font-bold mb-2">今週やること({week.length}件)</h2>
        {week.length === 0 && <Card><p className="text-sm text-slate-500">今週の必須施策はありません。</p></Card>}
        <div className="space-y-3">{week.map((a) => <ActionCard key={a.id} a={a} compact />)}</div>
        <Link to="/actions" className="block text-center text-sm text-mint underline mt-3">すべての改善候補({s.actions.length}件)を見る</Link>
      </div>

      {s.skipList.length > 0 && (
        <Card>
          <h2 className="font-bold text-sm mb-1">今月はやらないこと</h2>
          <ul className="text-sm space-y-1">{s.skipList.slice(0, 3).map((k) => <li key={k.id}><span className="text-slate-700">{k.title}</span><div className="text-xs text-slate-500">{k.reason}</div></li>)}</ul>
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-sm mb-1">データの鮮度</h2>
        <ul className="text-xs space-y-0.5">
          {s.freshness.map((f) => (
            <li key={f.id} className="flex justify-between"><span>{f.label}</span><span className={f.status === "ok" ? "text-emerald-600" : f.status === "missing" ? "text-rose-600" : "text-amber-600"}>{f.latest ?? "未取得"}{f.lagDays != null ? `(${f.lagDays}日前)` : ""}</span></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function ActionsPage() {
  const { summary: s, state } = useData();
  const [showDone, setShowDone] = useState(false);
  if (!s) return null;
  const list = s.actions.filter((a) => showDone || !["done", "skipped"].includes(state[a.id]?.status ?? "open"));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">改善候補</h1>
      <p className="text-sm text-slate-500">期待成果 × 確度 ÷ 手間 の順に並べています。期待効果は「問い合わせ件数」に換算した幅つきの推定です。</p>
      <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />実施済み・見送りも表示</label>
      <div className="space-y-3">{list.map((a) => <ActionCard key={a.id} a={a} compact />)}</div>
      {list.length === 0 && <Card><p className="text-sm text-slate-500">対応が必要な候補はありません。</p></Card>}
    </div>
  );
}

const V: Record<string, string> = { measuring: "計測中", up: "増加傾向", down: "減少傾向", flat: "横ばい", unknown: "判定不能(母数不足)" };

export function HistoryPage() {
  const { summary: s, state } = useData();
  if (!s) return null;
  const done = s.actions.filter((a) => state[a.id]?.status === "done");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">施策履歴と効果</h1>
      {s.effects.length === 0 && <Card><p className="text-sm text-slate-500">まだ「実施した」施策がありません。実施済みにすると、翌朝から14日間の前後比較を始めます。</p></Card>}
      {s.effects.map((e, i) => (
        <Card key={i} className="space-y-1">
          <div className="text-xs text-slate-500">{e.date}{e.url ? ` / ${e.url}` : ""}</div>
          <div className="font-semibold text-sm">{e.note}</div>
          <div className="text-sm">判定:<b>{V[e.verdict] ?? e.verdict}</b>(経過{e.days}日)</div>
          <div className="text-xs text-slate-600">クリック: 実施前14日 {e.before.clicks ?? 0} → 実施後 {e.after ? e.after.clicks : "計測待ち"}</div>
          <div className="text-[11px] text-slate-400">{e.caveat}</div>
        </Card>
      ))}
      {done.length > 0 && <p className="text-xs text-slate-400">実施済み {done.length} 件</p>}
    </div>
  );
}
