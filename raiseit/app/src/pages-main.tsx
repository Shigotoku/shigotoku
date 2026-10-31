import { useState } from "react";
import { useSearchParams } from "react-router-dom";

const AREA_NAME: Record<string, string> = { seo: "検索(SEO)", geo: "AI検索(GEO)", meo: "地図(MEO)", sns: "SNS", site: "サイトの土台" };
import { api, type Action, type GapSection } from "./lib";
import { Card, useData } from "./ui";
import { buildAiPrompt, buildCombinedPrompt, CONFIDENCE_HELP, plainOf, RISK_HELP } from "./plain";

const RISK = { low: "低", mid: "中", high: "高" } as const;
const RISK_CLS = { low: "bg-emerald-50 text-emerald-700", mid: "bg-amber-50 text-amber-700", high: "bg-rose-50 text-rose-700" } as const;
const STATUS_LABEL: Record<string, string> = { open: "未対応", approved: "承認済み(実施待ち)", done: "実施済み", skipped: "見送り" };

function Chip({ children, cls = "bg-slate-100 text-slate-600" }: { children: React.ReactNode; cls?: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{children}</span>;
}

function CopyButton({ label, text, primary = false }: { label: string; text: string; primary?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // クリップボード API が使えない環境(古いブラウザ・非HTTPS)向けの代替
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button type="button" onClick={copy} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${done ? "bg-mint text-white border-mint" : primary ? "bg-ink text-white border-ink" : "text-ink"}`}>
      {done ? "コピーしました。AIに貼り付けてください" : label}
    </button>
  );
}

/** 検索クリックと GA4 自然検索セッションを、ページ群ごとに並べる(どこで計測が欠けているかを一目で示す) */
function GapTable({ sections }: { sections: GapSection[] }) {
  return (
    <div>
      <div className="font-semibold text-xs text-slate-500 mb-1">ページ群別の内訳(検索クリック → GA4 自然検索セッション)</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b">
              <th className="text-left py-1 pr-2 font-normal">ページ群</th>
              <th className="text-right py-1 px-2 font-normal">クリック</th>
              <th className="text-right py-1 px-2 font-normal">セッション</th>
              <th className="text-right py-1 px-2 font-normal">比率</th>
              <th className="text-right py-1 pl-2 font-normal">タグなし</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const low = s.ratioPct !== null && s.clicks >= 30 && s.ratioPct < 50;
              return (
                <tr key={s.section} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-mono">{s.section}</td>
                  <td className="py-1 px-2 text-right tabular-nums">{s.clicks}</td>
                  <td className="py-1 px-2 text-right tabular-nums">{s.orgSessions}</td>
                  <td className={`py-1 px-2 text-right tabular-nums ${low ? "text-rose-700 font-semibold" : ""}`}>{s.ratioPct === null ? "-" : `${s.ratioPct}%`}</td>
                  <td className={`py-1 pl-2 text-right tabular-nums ${s.noTag ? "text-rose-700 font-semibold" : "text-slate-400"}`}>{s.audited ? `${s.noTag}/${s.audited}` : "未監査"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-slate-400 mt-1">比率が低くタグなしのページ群が、計測の欠けの主因です。「未監査」は公開ページ監査の対象外(流入上位のページのみ確認)。</div>
    </div>
  );
}

export function ActionCard({ a, compact = false, selected, onToggle }: { a: Action; compact?: boolean; selected?: boolean; onToggle?: () => void }) {
  const { state, setStatus, role } = useData();
  const [open, setOpen] = useState(!compact);
  const { summary } = useData();
  const st = state[a.id]?.status ?? "open";
  const writable = ["owner", "admin", "editor"].includes(role);
  const p = plainOf(a);
  const prompt = buildAiPrompt(a, summary?.site.name ?? "", summary?.period.latest ?? "");
  const [showPrompt, setShowPrompt] = useState(false);
  return (
    <Card className={`space-y-3 ${selected ? "ring-2 ring-mint" : ""}`}>
      {onToggle && (
        <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
          <input type="checkbox" className="h-4 w-4" checked={!!selected} onChange={onToggle} />
          まとめてプロンプトにする
        </label>
      )}
      <div className="flex flex-wrap gap-1.5">
        <span title={p.areaInfo.hint}><Chip cls={p.areaInfo.cls}>{p.areaInfo.label}</Chip></span>
        <span title="作業にかかる時間の目安"><Chip>作業 約{a.effortMin}分</Chip></span>
        <span title={CONFIDENCE_HELP}><Chip>見込みの確かさ {a.confidenceLabel}</Chip></span>
        <span title={RISK_HELP}><Chip cls={RISK_CLS[a.risk]}>変更の注意度 {RISK[a.risk]}</Chip></span>
        {st !== "open" && <Chip cls="bg-mint/10 text-mint">{STATUS_LABEL[st]}</Chip>}
      </div>
      <div className="font-semibold leading-snug">{p.headline}</div>
      <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3 text-sm space-y-1.5">
        <div><span className="text-xs font-semibold text-slate-500">何が悪い?</span><div>{p.problem}</div></div>
        <div><span className="text-xs font-semibold text-slate-500">放っておくと</span><div>{p.risk}</div></div>
        {a.why[0] && <div><span className="text-xs font-semibold text-slate-500">実際のデータ</span><div className="text-slate-600">{a.why[0]}</div></div>}
      </div>
      <div className="text-sm text-slate-600">期待できる効果:{a.impact.label}</div>
      {a.url && <div className="text-xs text-slate-500">対象ページ:<span className="font-mono">{a.url}</span></div>}
      <div className="rounded-lg border border-mint/40 bg-mint/5 p-3 space-y-2">
        <div className="text-xs text-slate-600">
          {p.mode === "guide" ? "これは管理画面での設定作業です。AIに手順を案内してもらえます。" : p.mode === "research" ? "AIに調べてもらい、対処案を出してもらいます。" : "サイトを作ったAI(Cursor・Claude・ChatGPTなど)に貼り付けると、修正してもらえます。"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton label="AIに渡すプロンプトをコピー" text={prompt} primary />
          <button type="button" className="text-xs text-mint underline" onClick={() => setShowPrompt(!showPrompt)}>{showPrompt ? "プロンプトを閉じる" : "プロンプトの中身を見る"}</button>
        </div>
        {showPrompt && <pre className="whitespace-pre-wrap break-words rounded-lg bg-white border p-3 text-xs leading-relaxed max-h-80 overflow-auto">{prompt}</pre>}
      </div>
      <button className="text-xs text-mint underline" onClick={() => setOpen(!open)}>{open ? "くわしい理由と手順を閉じる" : "くわしい理由と手順を見る"}</button>
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
          {a.evidence?.sections?.length ? <GapTable sections={a.evidence.sections} /> : null}
          {a.instructions && (
            <div>
              <div className="font-semibold text-xs text-slate-500 mb-1">制作会社・担当者に頼む場合</div>
              <CopyButton label="制作会社向けの依頼文をコピー" text={a.instructions.vendor} />
            </div>
          )}
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

export function ActionsPage() {
  const { summary: s, state } = useData();
  const [showDone, setShowDone] = useState(false);
  const [params, setParams] = useSearchParams();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [showCombined, setShowCombined] = useState(false);
  if (!s) return null;
  const toggle = (id: string) => setSel((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = s.actions.filter((a) => sel.has(a.id));
  const combined = buildCombinedPrompt(chosen, s.site.name, s.period.latest);
  const area = params.get("area");
  const list = s.actions
    .filter((a) => !area || plainOf(a).area === area)
    .filter((a) => showDone || !["done", "skipped"].includes(state[a.id]?.status ?? "open"));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">改善候補</h1>
      <Card className="text-sm space-y-2">
        <div className="font-semibold">使い方(3ステップ)</div>
        <ol className="list-decimal pl-5 space-y-1 text-slate-600">
          <li>レイジットが検索・AI検索・地図・アクセスのデータを見張り、「ここが悪い」を見つけます。</li>
          <li>直したい項目にチェックを入れ、画面下の「まとめたプロンプトをコピー」を押します(1件だけなら、その項目のボタンでもOK)。</li>
          <li>HP・LPを作ったAI(Cursor・Claude・ChatGPTなど)に貼り付けて、修正してもらいます。直したら「実施した」を押すと効果を測ります。</li>
        </ol>
        <p className="text-xs text-slate-400">上にあるほどおすすめ順です(効果の大きさ・確かさ・手間の少なさで並べています)。期待効果は「問い合わせ件数」に換算した幅つきの推定です。SNSとGoogleマップの監視は今後対応予定です。</p>
      </Card>
      {area && <div className="text-sm">絞り込み中:<b>{AREA_NAME[area] ?? area}</b> <button className="text-mint underline text-xs ml-2" onClick={() => setParams({})}>すべて表示</button></div>}
      <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />実施済み・見送りも表示</label>
      <div className="flex flex-wrap gap-3 text-sm">
        <button className="text-mint underline" onClick={() => setSel(new Set(list.map((a) => a.id)))}>表示中をすべて選ぶ</button>
        {sel.size > 0 && <button className="text-slate-500 underline" onClick={() => setSel(new Set())}>選択を解除</button>}
      </div>
      <div className="grid xl:grid-cols-2 gap-3 items-start">{list.map((a) => <ActionCard key={a.id} a={a} compact selected={sel.has(a.id)} onToggle={() => toggle(a.id)} />)}</div>
      {chosen.length > 0 && (
        <div className="sticky bottom-16 lg:bottom-3 z-10 rounded-2xl bg-white shadow-lg border border-mint/40 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold flex-1 min-w-40">{chosen.length}件を選択中</div>
            <CopyButton label={`選んだ${chosen.length}件をまとめたプロンプトをコピー`} text={combined} primary />
            <button type="button" className="text-xs text-mint underline" onClick={() => setShowCombined(!showCombined)}>{showCombined ? "閉じる" : "中身を見る"}</button>
          </div>
          {showCombined && <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 border p-3 text-xs leading-relaxed max-h-72 overflow-auto">{combined}</pre>}
        </div>
      )}
      {list.length === 0 && <Card><p className="text-sm text-slate-500">対応が必要な候補はありません。</p></Card>}
    </div>
  );
}

const V: Record<string, string> = { measuring: "計測中", up: "増加傾向", down: "減少傾向", flat: "横ばい", unknown: "判定不能(母数不足)" };

export function HistoryPage() {
  const { summary: s, site, role, reload } = useData();
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  if (!s) return null;
  const add = async () => {
    setMsg("");
    try {
      await api("/history", { method: "POST", body: { site, date, url, note } });
      setNote("");
      setUrl("");
      setMsg("記録しました。効果測定は翌朝の更新から反映されます。");
      await reload();
    } catch {
      setMsg("記録できませんでした(日付・URLの形式を確認してください)。");
    }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">施策履歴と効果</h1>
      {["owner", "admin", "editor"].includes(role) && (
        <Card className="space-y-2">
          <h2 className="font-bold text-sm">過去の施策を記録する</h2>
          <p className="text-xs text-slate-500">サイトを変更した日付と内容を残すと、その前後14日の検索クリックを比較します(URLを入れるとそのページだけを比較)。</p>
          <div className="grid md:grid-cols-12 gap-2">
            <input type="date" className="md:col-span-2 border rounded-lg p-2" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            <input className="md:col-span-4 border rounded-lg p-2" placeholder="対象URL(省略でサイト全体)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <input className="md:col-span-5 border rounded-lg p-2" placeholder="内容(例: タイトルを変更)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button onClick={add} disabled={!note.trim()} className="md:col-span-1 rounded-lg bg-ink text-white disabled:opacity-40">記録</button>
          </div>
          {msg && <p className="text-xs text-slate-600">{msg}</p>}
        </Card>
      )}
      {s.effects.length === 0 && <Card><p className="text-sm text-slate-500">まだ記録がありません。</p></Card>}
      <div className="grid lg:grid-cols-2 gap-3">
        {s.effects.map((e, i) => (
          <Card key={i} className="space-y-1">
            <div className="text-xs text-slate-500">{e.date}{e.url ? ` / ${e.url}` : " / サイト全体"}</div>
            <div className="font-semibold text-sm">{e.note}</div>
            <div className="text-sm">判定:<b>{V[e.verdict] ?? e.verdict}</b>{e.days < 1 ? "(実施日のデータが反映されるまで計測待ち)" : `(経過${e.days}日)`}</div>
            <div className="text-xs text-slate-600">クリック: 実施前14日 {e.before.clicks ?? 0} → 実施後{Math.max(0, e.afterDays)}日 {e.after ? e.after.clicks : "計測待ち"}</div>
            <div className="text-[11px] text-slate-400">{e.caveat}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}