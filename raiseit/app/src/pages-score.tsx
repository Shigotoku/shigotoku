import { Link } from "react-router-dom";
import type { Action } from "./lib";
import { plainOf, type Area } from "./plain";
import { Card, Delta, useData } from "./ui";

type Key = Area["key"];
const ORDER: { key: Key; title: string; sub: string }[] = [
  { key: "seo", title: "SEO評価", sub: "Google検索での見つけられやすさ" },
  { key: "geo", title: "GEO評価", sub: "ChatGPT等のAIに紹介されやすさ" },
  { key: "meo", title: "MEO評価", sub: "Googleマップでの見つけられやすさ" },
  { key: "sns", title: "SNS評価", sub: "SNSからの集客" },
  { key: "site", title: "サイトの土台", sub: "計測・表示速度・問い合わせまでの流れ" },
];
/** 未接続の分野は評価できない(嘘の点数を出さない) */
const NOT_CONNECTED: Partial<Record<Key, string>> = {
  meo: "Googleビジネスプロフィールを未接続のため、順位・口コミ・電話/ルート検索は評価できません。接続機能は今後追加予定です。",
  sns: "Instagram・X・YouTubeを未接続のため評価できません。接続機能は今後追加予定です。",
};

function grade(score: number) {
  if (score >= 80) return { label: "良好", cls: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" };
  if (score >= 60) return { label: "もう一息", cls: "bg-amber-50 text-amber-700", bar: "bg-amber-500" };
  return { label: "要改善", cls: "bg-rose-50 text-rose-700", bar: "bg-rose-500" };
}

function AreaCard({ k, title, sub, actions }: { k: Key; title: string; sub: string; actions: Action[] }) {
  const { summary: s, state } = useData();
  if (!s) return null;
  const st = (a: Action) => state[a.id]?.status ?? "open";
  const open = actions.filter((a) => st(a) === "open");
  const doing = actions.filter((a) => st(a) === "approved");
  const done = actions.filter((a) => st(a) === "done");
  const skipped = actions.filter((a) => st(a) === "skipped");
  const target = actions.length - skipped.length;
  const progress = target ? Math.round((done.length / target) * 100) : 100;
  // 目安の点数: 未対応の改善候補が多い・確かなものが多いほど下がる(最低20)
  const score = Math.max(20, 100 - open.reduce((n, a) => n + (a.confidence >= 0.5 ? 14 : 7), 0) - doing.length * 3);
  const nc = NOT_CONNECTED[k];
  const g = nc ? null : grade(score);
  const first = open[0];

  let metric: React.ReactNode = null;
  if (k === "seo") metric = (<><div className="text-xs text-slate-500">検索クリック(直近{s.period.days}日)</div><div className="text-2xl font-bold">{s.seo.clicks.toLocaleString()}<span className="text-xs font-normal text-slate-500"> 回</span></div><Delta cur={s.seo.clicks} prev={s.seo.prev.clicks} /><div className="text-xs text-slate-500 mt-1">平均{s.seo.position}位 / クリック率{s.seo.ctrPct}%</div></>);
  if (k === "geo") metric = (<><div className="text-xs text-slate-500">AI経由の訪問(直近{s.period.days}日)</div><div className="text-2xl font-bold">{s.ai.sessions}<span className="text-xs font-normal text-slate-500"> 回</span></div><Delta cur={s.ai.sessions} prev={s.ai.prev} /><div className="text-xs text-slate-500 mt-1">{s.ai.sources.slice(0, 3).map((x) => `${x.source} ${x.sessions}`).join(" / ") || "まだAI経由の訪問は検出されていません"}</div></>);
  if (k === "site") metric = (<><div className="text-xs text-slate-500">サイト全体の{s.northStar.label}(直近{s.period.days}日)</div><div className="text-2xl font-bold">{s.northStar.cur}<span className="text-xs font-normal text-slate-500"> 件</span></div><Delta cur={s.northStar.cur} prev={s.northStar.prev} /></>);

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">{title}</h2>
          <div className="text-xs text-slate-500">{sub}</div>
        </div>
        {nc ? <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 text-xs font-semibold">未接続</span> : (
          <div className="text-right"><div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${g!.cls}`}>{g!.label}</div><div className="text-[11px] text-slate-400 mt-0.5">目安 {score}点</div></div>
        )}
      </div>
      {nc && <p className="text-sm text-slate-600">{nc}</p>}
      {metric && <div>{metric}</div>}
      {actions.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600"><span>対策の進み具合</span><span>{done.length}/{target}件 完了({progress}%)</span></div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${g?.bar ?? "bg-mint"}`} style={{ width: `${progress}%` }} /></div>
          <div className="flex flex-wrap gap-x-3 text-xs text-slate-500"><span>未対応 {open.length}</span><span>AIに依頼中・実施待ち {doing.length}</span><span>実施済み {done.length}</span>{skipped.length > 0 && <span>見送り {skipped.length}</span>}</div>
        </div>
      ) : (
        !nc && <p className="text-xs text-slate-500">今のところ、改善が必要な項目は見つかっていません。</p>
      )}
      {first && <div className="text-sm"><span className="text-xs text-slate-500">次にやること:</span> {plainOf(first).headline}</div>}
      {actions.length > 0 && <Link to={`/actions?area=${k}`} className="inline-block text-sm text-mint underline">この分野の改善候補を見る →</Link>}
    </Card>
  );
}

export function ScorePage() {
  const { summary: s } = useData();
  if (!s) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">集客の通信簿</h1>
      <p className="text-sm text-slate-500">SEO・GEO・MEO・SNSの4分野について、現状の評価と、対策がどこまで進んでいるかを一覧にしています。点数は「見つかっている改善候補がどれだけ残っているか」から出した目安です(100点に近いほど、直すべき点が少ない状態)。</p>
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        {ORDER.map((o) => (
          <AreaCard key={o.key} k={o.key} title={o.title} sub={o.sub} actions={s.actions.filter((a) => plainOf(a).area === o.key)} />
        ))}
      </div>
    </div>
  );
}
