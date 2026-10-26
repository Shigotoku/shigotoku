import { Link } from "react-router-dom";
import type { Action } from "./lib";
import { Bars, Delta, Spark, useData } from "./ui";

const RISK = { low: ["低", "bg-emerald-50 text-emerald-700"], mid: ["中", "bg-amber-50 text-amber-700"], high: ["高", "bg-rose-50 text-rose-700"] } as const;
const ST: Record<string, string> = { approved: "承認済み", done: "実施済み", skipped: "見送り" };

function Kpi({ label, value, unit = "", sub, children }: { label: string; value: string | number; unit?: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm px-3 py-2 min-w-0">
      <div className="text-[11px] text-slate-500 truncate">{label}</div>
      <div className="text-2xl font-bold leading-tight">{value}<span className="text-xs font-normal text-slate-500">{unit}</span></div>
      <div className="leading-tight">{sub}</div>
      {children}
    </div>
  );
}

function Row({ a }: { a: Action }) {
  const { state, setStatus, role } = useData();
  const st = state[a.id]?.status ?? "open";
  const w = ["owner", "admin", "editor"].includes(role);
  const [rl, rc] = RISK[a.risk];
  return (
    <li className="py-2 border-b last:border-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug">{a.title}</div>
          <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2">
            <span>{a.category}</span><span>{a.impact.label}</span><span>確度{a.confidenceLabel}</span><span>約{a.effortMin}分</span>
            <span className={`rounded px-1 ${rc}`}>リスク{rl}</span>
            {st !== "open" && <span className="text-mint font-semibold">{ST[st]}</span>}
          </div>
        </div>
        {w && (
          <div className="shrink-0 flex gap-1">
            {st === "open" && (<><button onClick={() => setStatus(a, "approved")} className="rounded-md bg-ink text-white text-xs px-3 py-1.5">承認</button><button onClick={() => setStatus(a, "skipped")} className="rounded-md border text-xs px-2 py-1.5">見送り</button></>)}
            {st === "approved" && (<><button onClick={() => setStatus(a, "done")} className="rounded-md bg-mint text-white text-xs px-3 py-1.5">実施した</button><button onClick={() => setStatus(a, "open")} className="rounded-md border text-xs px-2 py-1.5">戻す</button></>)}
            {(st === "done" || st === "skipped") && <button onClick={() => setStatus(a, "open")} className="rounded-md border text-xs px-2 py-1.5">戻す</button>}
          </div>
        )}
      </div>
    </li>
  );
}

export function Home() {
  const { summary: s, detail: d, state, loading } = useData();
  if (loading && !s) return <p className="text-slate-500">読み込み中…</p>;
  if (!s) return null;
  const n = s.northStar;
  const week = s.thisWeek.map((id) => s.actions.find((a) => a.id === id)).filter((a): a is Action => !!a && (state[a.id]?.status ?? "open") !== "skipped");
  const f = s.funnel;
  const daily = d?.daily.slice(-60) ?? [];
  const open = s.actions.filter((a) => (state[a.id]?.status ?? "open") === "open").length;
  const staleFresh = s.freshness.filter((x) => x.status !== "ok");

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-2.5rem)] lg:overflow-hidden">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-lg font-bold">{s.site.name} 今月の結論 <span className="text-xs font-normal text-slate-500">{s.period.from} 〜 {s.period.to}(直近{s.period.days}日・前期間と比較)</span></h1>
        <span className="text-[11px] text-slate-400 hidden sm:inline">更新 {new Date(s.generatedAt).toLocaleString("ja-JP")}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <Kpi label={`${n.label}(最重要)`} value={n.cur} unit="件" sub={<Delta cur={n.cur} prev={n.prev} unit="件" />} />
        <Kpi label="セッション" value={f.sessions.toLocaleString()} sub={<Delta cur={f.sessions} prev={f.sessionsPrev} />} />
        <Kpi label="検索クリック" value={s.seo.clicks.toLocaleString()} sub={<Delta cur={s.seo.clicks} prev={s.seo.prev.clicks} />} />
        <Kpi label="検索表示 / CTR / 平均順位" value={s.seo.impressions.toLocaleString()} sub={<span className="text-xs text-slate-600">CTR {s.seo.ctrPct}% / {s.seo.position}位</span>} />
        <Kpi label="フォーム開始 → 成果" value={f.formStart} unit="開始" sub={<span className="text-xs text-slate-600">成果{f.leads}件{f.formAbandonPct != null ? ` / 離脱約${f.formAbandonPct}%` : ""}</span>} />
        <Kpi label="AI経由の訪問" value={s.ai.sessions} unit="件" sub={<Delta cur={s.ai.sessions} prev={s.ai.prev} unit="件" />} />
      </div>

      <div className="grid lg:grid-cols-12 gap-3 flex-1 min-h-0">
        <section className="lg:col-span-4 bg-white rounded-xl shadow-sm p-3 flex flex-col min-h-0">
          <h2 className="text-sm font-bold">推移(直近60日)</h2>
          <div className="flex gap-3 text-[11px] mb-1"><span className="text-sky-600">━ クリック</span><span className="text-mint">━ セッション</span><span className="text-rose-600">━ 成果</span></div>
          {daily.length ? (
            <Spark labels={daily.map((x) => x.date.slice(5))} height={110} series={[
              { name: "クリック", color: "#0284c7", values: daily.map((x) => x.clicks) },
              { name: "セッション", color: "#1f9d8a", values: daily.map((x) => x.sessions) },
              { name: "成果", color: "#e11d48", values: daily.map((x) => x.leads) },
            ]} />
          ) : <p className="text-xs text-slate-400">詳細データを読み込み中…</p>}
          <h2 className="text-sm font-bold mt-2">成果の週次(12週)</h2>
          <Bars values={n.weekly.map((w) => w.leads)} labels={n.weekly.map((w) => `${w.from}〜${w.to}`)} height={84} />
        </section>

        <section className="lg:col-span-5 bg-white rounded-xl shadow-sm p-3 flex flex-col min-h-0">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold">今週やること({week.length}件)</h2>
            <Link to="/actions" className="text-xs text-mint underline">全{open}件の候補</Link>
          </div>
          <ul className="overflow-y-auto min-h-0 flex-1">
            {week.length === 0 && <li className="text-sm text-slate-500 py-3">今週の必須施策はありません。</li>}
            {week.map((a) => <Row key={a.id} a={a} />)}
          </ul>
          {s.skipList.length > 0 && <p className="text-[11px] text-slate-500 border-t pt-1">今月はやらない: {s.skipList.length}件(効果が小さい・確度が低い)</p>}
        </section>

        <section className="lg:col-span-3 bg-white rounded-xl shadow-sm p-3 flex flex-col min-h-0 overflow-hidden">
          <h2 className="text-sm font-bold">チャネル別</h2>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500"><th className="font-normal">経路</th><th className="font-normal text-right">訪問</th><th className="font-normal text-right">成果</th><th className="font-normal text-right">率</th></tr></thead>
            <tbody>
              {s.channels.slice(0, 6).map((c) => <tr key={c.channel} className="border-t"><td className="py-1 truncate max-w-24">{c.channel}</td><td className="text-right">{c.sessions}</td><td className="text-right">{c.leads}</td><td className="text-right">{c.cvrPct}%</td></tr>)}
            </tbody>
          </table>
          <h2 className="text-sm font-bold mt-2">入口ページ(成果率)</h2>
          <ul className="text-xs overflow-y-auto min-h-0">
            {s.landing.slice(0, 6).map((l) => <li key={l.path} className="flex justify-between gap-2 border-t py-1"><span className="truncate">{l.path}</span><span className="shrink-0 text-slate-500">{l.sessions}訪問 {l.cvrPct}%</span></li>)}
          </ul>
        </section>
      </div>

      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 items-center">
        <span>データ鮮度:</span>
        {s.freshness.map((x) => <span key={x.id} className={x.status === "ok" ? "text-emerald-600" : x.status === "missing" ? "text-rose-600" : "text-amber-600"}>● {x.label}{x.lagDays != null ? ` ${x.lagDays}日前` : " 未取得"}</span>)}
        {s.audit?.checked ? <span>| 公開ページ監査 {s.audit.checked}件中 異常なし{s.audit.clean}件</span> : null}
        {staleFresh.length === 0 && <span className="text-slate-400">| 効果は推定です。サイトは自動では変更しません。</span>}
      </div>
    </div>
  );
}
