import { useState } from "react";
import { api, type Action } from "./lib";
import { Card, useData } from "./ui";

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
      <div className="grid xl:grid-cols-2 gap-3 items-start">{list.map((a) => <ActionCard key={a.id} a={a} compact />)}</div>
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