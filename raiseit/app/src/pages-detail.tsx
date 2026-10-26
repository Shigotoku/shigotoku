import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Detail } from "./lib";
import { Card, Delta, Spark, useData } from "./ui";

type Col<T> = { key: string; label: string; get: (r: T) => number | string; render?: (r: T) => ReactNode; num?: boolean };

function toCsv<T>(rows: T[], cols: Col<T>[], name: string) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = [cols.map((c) => esc(c.label)).join(","), ...rows.map((r) => cols.map((c) => esc(c.get(r))).join(","))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function SortTable<T>({ rows, cols, filterKey, filterPlaceholder, csv = "data", extra }: { rows: T[]; cols: Col<T>[]; filterKey?: (r: T) => string; filterPlaceholder?: string; csv?: string; extra?: ReactNode }) {
  const [sort, setSort] = useState(cols.find((c) => c.num)?.key ?? cols[0].key);
  const [desc, setDesc] = useState(true);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const view = useMemo(() => {
    const c = cols.find((x) => x.key === sort)!;
    let r = filterKey && q ? rows.filter((x) => filterKey(x).toLowerCase().includes(q.toLowerCase())) : rows;
    r = [...r].sort((a, b) => {
      const x = c.get(a), y = c.get(b);
      const d = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ja");
      return desc ? -d : d;
    });
    return r;
  }, [rows, cols, sort, desc, q, filterKey]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {filterKey && <input className="w-full md:w-80 border rounded-lg p-2 text-sm" placeholder={filterPlaceholder ?? "絞り込み"} value={q} onChange={(e) => setQ(e.target.value)} />}
        {extra}
        <button onClick={() => toCsv(view, cols, csv)} className="ml-auto rounded-lg border px-3 py-1.5 text-xs">CSVで保存(表示中の{view.length}件)</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              {cols.map((c) => (
                <th key={c.key} onClick={() => (sort === c.key ? setDesc(!desc) : (setSort(c.key), setDesc(true)))} className={`py-1.5 px-1 font-normal cursor-pointer select-none whitespace-nowrap ${c.num ? "text-right" : ""}`}>
                  {c.label}{sort === c.key ? (desc ? " ▼" : " ▲") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.slice(0, limit).map((r, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                {cols.map((c) => <td key={c.key} className={`py-1 px-1 ${c.num ? "text-right tabular-nums" : "max-w-72 truncate"}`}>{c.render ? c.render(r) : c.get(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-slate-400">{view.length}件中 {Math.min(limit, view.length)}件を表示{view.length > limit && <button className="ml-2 underline text-mint" onClick={() => setLimit(limit + 100)}>さらに表示</button>}</div>
    </div>
  );
}

const pos = (cur: number, prev: number) => {
  if (!prev || !cur) return <span className="text-slate-400">{cur || "-"}</span>;
  const d = Math.round((prev - cur) * 10) / 10;
  return <span>{cur}<span className={`ml-1 ${d > 0 ? "text-emerald-600" : d < 0 ? "text-rose-600" : "text-slate-400"}`}>{d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : "→"}</span></span>;
};
const chg = (cur: number, prev: number) => <Delta cur={cur} prev={prev} />;

type Tab = "daily" | "queries" | "pages" | "sources" | "views" | "devices";
const TABS: [Tab, string][] = [["daily", "日次推移"], ["queries", "検索語"], ["pages", "ページ別"], ["sources", "流入元"], ["views", "閲覧ページ"], ["devices", "端末・曜日"]];
const DEV: Record<string, string> = { MOBILE: "スマホ", DESKTOP: "PC", TABLET: "タブレット", UNKNOWN: "不明" };

export function DetailPage() {
  const { detail: base, site } = useData();
  const [days, setDays] = useState(28);
  const [alt, setAlt] = useState<Detail | null>(null);
  const [intent, setIntent] = useState("");
  useEffect(() => {
    if (days === 28) return setAlt(null);
    setAlt(null);
    api<Detail>(`/detail?site=${site}&days=${days}`).then(setAlt).catch(() => setAlt(null));
  }, [days, site]);
  const d = days === 28 ? base : alt;
  const [tab, setTab] = useState<Tab>("daily");
  const [metric, setMetric] = useState<"clicks" | "impressions" | "sessions" | "leads" | "formStart" | "position">("clicks");
  const periodBar = (
    <div className="flex gap-1 text-xs">
      {[7, 28, 90].map((n) => <button key={n} onClick={() => setDays(n)} className={`rounded-full px-3 py-1 ${days === n ? "bg-mint text-white" : "bg-white border"}`}>直近{n}日</button>)}
    </div>
  );
  if (!d) return <div className="space-y-3"><h1 className="text-xl font-bold">詳細データ</h1>{periodBar}<p className="text-slate-500">読み込み中、または未作成です(翌朝の更新で作成されます)。</p></div>;
  const P = d.period;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold">詳細データ</h1>
        <p className="text-xs text-slate-500">現在期間 {P.from} 〜 {P.to}(直近{P.days}日)と、その前の{P.days}日({P.prevFrom} 〜 {P.prevTo})を比較。列名で並べ替え、CSVで保存できます。</p>
      </div>
      {periodBar}
      <div className="flex flex-wrap gap-1">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1.5 text-sm ${tab === k ? "bg-ink text-white" : "bg-white border"}`}>{l}</button>)}
      </div>

      {tab === "daily" && (
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-1 text-xs">
            {([["clicks", "検索クリック"], ["impressions", "検索表示"], ["position", "平均順位"], ["sessions", "セッション"], ["formStart", "フォーム開始"], ["leads", "成果"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setMetric(k)} className={`rounded-full px-3 py-1 ${metric === k ? "bg-mint text-white" : "bg-slate-100"}`}>{l}</button>
            ))}
          </div>
          <Spark height={150} labels={d.daily.map((x) => x.date.slice(5))} series={[{ name: metric, color: "#1f9d8a", values: d.daily.map((x) => (metric === "position" ? (x.position ? 20 - Math.min(20, x.position) : 0) : x[metric])) }]} />
          {metric === "position" && <p className="text-[11px] text-slate-400">順位は上にあるほど良い順位になるよう反転表示しています。</p>}
          <SortTable
            rows={[...d.daily].reverse()}
            cols={[
              { key: "date", label: "日付", get: (r) => r.date },
              { key: "clicks", label: "クリック", get: (r) => r.clicks, num: true },
              { key: "impressions", label: "表示", get: (r) => r.impressions, num: true },
              { key: "position", label: "順位", get: (r) => r.position, num: true },
              { key: "sessions", label: "セッション", get: (r) => r.sessions, num: true },
              { key: "engaged", label: "エンゲージ", get: (r) => r.engaged, num: true },
              { key: "formStart", label: "フォーム開始", get: (r) => r.formStart, num: true },
              { key: "leads", label: "成果", get: (r) => r.leads, num: true },
            ]}
          />
        </Card>
      )}

      {tab === "queries" && (
        <Card className="space-y-2">
          <p className="text-[11px] text-amber-700">{d.notes.queries}</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {d.intents.map((i) => (
              <button key={i.intent} onClick={() => setIntent(intent === i.intent ? "" : i.intent)} className={`text-left rounded-lg border p-2 ${intent === i.intent ? "border-mint bg-mint/5" : ""}`}>
                <div className="text-[11px] text-slate-500">{i.intent}</div>
                <div className="text-sm font-bold">{i.clicks}<span className="text-xs font-normal text-slate-500"> クリック</span></div>
                <div className="text-[11px] text-slate-500">{i.queries}語 / 表示 {i.impressions.toLocaleString()}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">検索意図はキーワードによる簡易分類です(完全ではありません)。上のカードで絞り込めます。</p>
          <SortTable
            csv="search-queries"
            rows={intent ? d.queries.filter((q) => q.intent === intent) : d.queries}
            filterKey={(r) => r.query}
            filterPlaceholder="検索語で絞り込み"
            cols={[
              { key: "query", label: "検索語", get: (r) => r.query },
              { key: "intent", label: "意図", get: (r) => r.intent },
              { key: "impressions", label: "表示", get: (r) => r.impressions, num: true },
              { key: "clicks", label: "クリック", get: (r) => r.clicks, num: true, render: (r) => <>{r.clicks} {chg(r.clicks, r.prevClicks)}</> },
              { key: "ctr", label: "CTR", get: (r) => r.ctrPct, num: true, render: (r) => `${r.ctrPct}%` },
              { key: "position", label: "順位", get: (r) => r.position, num: true, render: (r) => pos(r.position, r.prevPosition) },
              { key: "topPage", label: "主なページ", get: (r) => r.topPage },
            ]}
          />
        </Card>
      )}

      {tab === "pages" && (
        <Card className="space-y-2">
          <p className="text-[11px] text-slate-500">検索(全体)と、GA4の入口セッション・成果を同じページで並べています。「検索→訪問」は検索クリックに対する自然検索セッションの比率で、40%未満(⚠)は計測(同意バナー・タグ)の確認が必要です。</p>
          <SortTable
            rows={d.pages}
            filterKey={(r) => r.path}
            filterPlaceholder="URLで絞り込み"
            cols={[
              { key: "path", label: "ページ", get: (r) => r.path },
              { key: "impressions", label: "表示", get: (r) => r.impressions, num: true },
              { key: "clicks", label: "クリック", get: (r) => r.clicks, num: true, render: (r) => <>{r.clicks} {chg(r.clicks, r.prevClicks)}</> },
              { key: "ctr", label: "CTR", get: (r) => r.ctrPct, num: true, render: (r) => `${r.ctrPct}%` },
              { key: "position", label: "順位", get: (r) => r.position, num: true, render: (r) => pos(r.position, r.prevPosition) },
              { key: "sessions", label: "入口セッション", get: (r) => r.sessions, num: true },
              { key: "gap", label: "検索→訪問", get: (r) => r.sessionPerClick, num: true, render: (r) => (r.clicks >= 20 ? <span className={r.sessionPerClick < 0.4 ? "text-rose-600 font-semibold" : ""}>{Math.round(r.sessionPerClick * 100)}%{r.sessionPerClick < 0.4 ? " ⚠" : ""}</span> : "-") },
              { key: "leads", label: "成果", get: (r) => r.leads, num: true },
              { key: "cvr", label: "成果率", get: (r) => r.cvrPct, num: true, render: (r) => `${r.cvrPct}%` },
            ]}
          />
        </Card>
      )}

      {tab === "sources" && (
        <Card>
          <SortTable
            rows={d.sources}
            filterKey={(r) => r.name}
            filterPlaceholder="流入元で絞り込み"
            cols={[
              { key: "name", label: "参照元 / メディア", get: (r) => r.name },
              { key: "channel", label: "チャネル", get: (r) => r.channel },
              { key: "sessions", label: "セッション", get: (r) => r.sessions, num: true, render: (r) => <>{r.sessions} {chg(r.sessions, r.prevSessions)}</> },
              { key: "engagedPct", label: "エンゲージ率", get: (r) => r.engagedPct, num: true, render: (r) => `${r.engagedPct}%` },
            ]}
          />
        </Card>
      )}

      {tab === "views" && (
        <Card>
          <SortTable
            rows={d.views}
            filterKey={(r) => r.path}
            filterPlaceholder="URLで絞り込み"
            cols={[
              { key: "path", label: "ページ", get: (r) => r.path },
              { key: "views", label: "閲覧数", get: (r) => r.views, num: true, render: (r) => <>{r.views} {chg(r.views, r.prevViews)}</> },
              { key: "sessions", label: "セッション", get: (r) => r.sessions, num: true },
              { key: "avg", label: "平均滞在(秒)", get: (r) => r.avgEngageSec, num: true },
              { key: "eng", label: "エンゲージ率", get: (r) => r.engagedPct, num: true, render: (r) => `${r.engagedPct}%` },
            ]}
          />
        </Card>
      )}

      {tab === "devices" && (
        <div className="grid lg:grid-cols-2 gap-3">
          <Card className="space-y-2">
            <h2 className="font-bold text-sm">端末別(検索)</h2>
            <p className="text-[11px] text-amber-700">{d.notes.devices}</p>
            <SortTable
              rows={d.devices}
              cols={[
                { key: "device", label: "端末", get: (r) => r.device, render: (r) => DEV[r.device] ?? r.device },
                { key: "impressions", label: "表示", get: (r) => r.impressions, num: true },
                { key: "clicks", label: "クリック", get: (r) => r.clicks, num: true, render: (r) => <>{r.clicks} {chg(r.clicks, r.prevClicks)}</> },
                { key: "ctr", label: "CTR", get: (r) => r.ctrPct, num: true, render: (r) => `${r.ctrPct}%` },
                { key: "position", label: "順位", get: (r) => r.position, num: true },
              ]}
            />
          </Card>
          <Card className="space-y-2">
            <h2 className="font-bold text-sm">曜日別の平均(直近90日・1日あたり)</h2>
            <SortTable
              rows={d.weekdays}
              cols={[
                { key: "dow", label: "曜日", get: (r) => r.dow },
                { key: "clicks", label: "検索クリック", get: (r) => r.clicks, num: true },
                { key: "sessions", label: "セッション", get: (r) => r.sessions, num: true },
                { key: "leads", label: "成果", get: (r) => r.leads, num: true },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
