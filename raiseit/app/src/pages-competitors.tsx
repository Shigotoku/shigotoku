import { useEffect, useState } from "react";
import { api, type Competitor } from "./lib";
import { Card, useData } from "./ui";

type Reg = { id?: string; name: string; url: string };

function Register() {
  const { site, role, reload } = useData();
  const [list, setList] = useState<Reg[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { api<Reg[]>(`/competitors?site=${site}`).then(setList).catch(() => setList([])); }, [site]);
  const save = async (next: Reg[]) => {
    setMsg("");
    try {
      setList(await api<Reg[]>(`/competitors?site=${site}`, { method: "PUT", body: { competitors: next } }));
      setMsg("保存しました。最初の観測は翌朝のジョブ(週次)で行われます。");
      void reload();
    } catch {
      setMsg("保存できませんでした(URLの形式、またはオーナー/管理者の権限を確認してください)。");
    }
  };
  if (!["owner", "admin"].includes(role)) return null;
  return (
    <Card className="space-y-2">
      <h2 className="font-bold text-sm">観測する競合サイトを登録(最大10件)</h2>
      <p className="text-xs text-slate-500">公開されているページとサイトマップだけを、週1回・低頻度で確認します。相手サイトの robots.txt が拒否している場合は観測しません。本文は保存せず、題名と説明のみ記録します。</p>
      <ul className="text-sm divide-y">
        {list.map((c) => (
          <li key={c.url} className="py-1.5 flex gap-2 items-center"><span className="font-semibold">{c.name}</span><span className="text-slate-500 truncate flex-1">{c.url}</span><button className="text-xs underline" onClick={() => save(list.filter((x) => x.url !== c.url))}>削除</button></li>
        ))}
      </ul>
      <div className="grid md:grid-cols-12 gap-2">
        <input className="md:col-span-3 border rounded-lg p-2" placeholder="名前(例: ○○社)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="md:col-span-7 border rounded-lg p-2" placeholder="トップページURL(https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button disabled={!name.trim() || !url.trim()} onClick={() => { void save([...list, { name, url }]); setName(""); setUrl(""); }} className="md:col-span-2 rounded-lg bg-ink text-white disabled:opacity-40">追加</button>
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </Card>
  );
}

function Spark({ c }: { c: Competitor }) {
  const v = c.sitemapTrend.map((x) => x.count ?? 0);
  if (v.length < 2) return null;
  const max = Math.max(...v, 1);
  const min = Math.min(...v);
  return (
    <svg viewBox="0 0 120 30" className="w-28 h-8"><polyline fill="none" stroke="#1f9d8a" strokeWidth="2" points={v.map((n, i) => `${(i / (v.length - 1)) * 118 + 1},${28 - ((n - min) / Math.max(1, max - min)) * 24}`).join(" ")} /></svg>
  );
}

export function CompetitorsPage() {
  const { summary: s } = useData();
  const list = s?.competitors ?? [];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">競合の定点観測</h1>
        <p className="text-xs text-slate-500">公開情報の週次スナップショットです。ページ数の増減と新規ページの題名から、競合が注力しているテーマの手がかりを得ます(推測であり、事実の保証ではありません)。</p>
      </div>
      <Register />
      {list.length === 0 && <Card><p className="text-sm text-slate-500">まだ観測データがありません。競合を登録すると、翌朝のジョブから観測が始まります(基準データは初回、新規ページの検出は2回目以降)。</p></Card>}
      <div className="grid xl:grid-cols-2 gap-3">
        {list.map((c) => (
          <Card key={c.id} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-bold">{c.name}</div>
              <a className="text-xs text-mint underline truncate" href={c.url} target="_blank" rel="noreferrer">{c.url}</a>
            </div>
            {!c.ok && <p className="text-sm text-amber-700">{c.note}</p>}
            {c.ok && (
              <>
                <div className="flex gap-4 items-center text-sm">
                  <div><div className="text-[11px] text-slate-500">サイトマップのページ数</div><div className="text-xl font-bold">{c.sitemapCount ?? "-"}</div></div>
                  <div><div className="text-[11px] text-slate-500">直近の新規</div><div className="text-xl font-bold">{c.newCount}<span className="text-xs font-normal">本</span></div></div>
                  <div><div className="text-[11px] text-slate-500">削除</div><div className="text-xl font-bold">{c.removedCount}<span className="text-xs font-normal">本</span></div></div>
                  <Spark c={c} />
                </div>
                {c.note && <p className="text-xs text-slate-500">{c.note}</p>}
                {c.home && (
                  <div className="text-xs bg-slate-50 rounded-lg p-2 space-y-0.5">
                    <div className="text-slate-500">トップページ(最終観測 {c.lastDate})</div>
                    <div className="font-semibold">{c.home.title}</div>
                    <div className="text-slate-600">{c.home.desc}</div>
                    <div className="text-slate-400">構造化データ: {c.home.jsonldTypes.join("、") || "なし"}</div>
                  </div>
                )}
                {c.newPages.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">新規ページ</div>
                    <ul className="text-xs divide-y">
                      {c.newPages.map((p) => (
                        <li key={p.url} className="py-1"><a href={p.url} target="_blank" rel="noreferrer" className="text-mint underline">{p.title || p.url}</a><span className="text-slate-400 ml-2">{p.date}</span>{p.desc && <div className="text-slate-500">{p.desc}</div>}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
