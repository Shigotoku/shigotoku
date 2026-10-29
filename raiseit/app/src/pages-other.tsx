import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { api, auth, type Finding } from "./lib";
import { Card, Delta, useData } from "./ui";

export function FunnelPage() {
  const { summary: s } = useData();
  if (!s) return null;
  const f = s.funnel;
  const steps: [string, number][] = [["セッション", f.sessions], ["フォーム開始", f.formStart], [s.northStar.label, f.leads]];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">流入・漏斗</h1>
      <Card>
        <h2 className="font-bold text-sm mb-2">訪問 → 問い合わせ</h2>
        {steps.map(([l, v]) => (
          <div key={l} className="mb-2">
            <div className="flex justify-between text-sm"><span>{l}</span><b>{v.toLocaleString()}</b></div>
            <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-mint" style={{ width: `${Math.max(2, (v / Math.max(1, f.sessions)) * 100)}%` }} /></div>
          </div>
        ))}
        <p className="text-sm">訪問あたりの成果率 <b>{f.sessionToLeadPct}%</b>{f.formAbandonPct != null && <> / フォーム離脱 約 <b>{f.formAbandonPct}%</b></>}</p>
        <p className="text-[11px] text-slate-400 mt-1">{f.note}</p>
      </Card>

      <Card>
        <h2 className="font-bold text-sm mb-2">チャネル別</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-1">チャネル</th><th>訪問</th><th>成果</th><th>成果率</th></tr></thead>
            <tbody>
              {s.channels.map((c) => (
                <tr key={c.channel} className="border-t"><td className="py-1.5">{c.channel}</td><td>{c.sessions}<br /><Delta cur={c.sessions} prev={c.prevSessions} /></td><td>{c.leads}</td><td>{c.cvrPct}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold text-sm mb-2">検索(Google)</h2>
        <p className="text-sm">クリック <b>{s.seo.clicks.toLocaleString()}</b> / 表示 {s.seo.impressions.toLocaleString()} / CTR {s.seo.ctrPct}% / 平均順位 {s.seo.position}</p>
        <p className="text-xs text-slate-500">{s.conversion.note}</p>
        <div className="mt-3 text-xs text-slate-500">上位ページ</div>
        <ul className="text-sm divide-y">
          {s.pagesTop.slice(0, 8).map((p) => (
            <li key={p.path} className="py-1.5"><div className="truncate">{p.path}</div><div className="text-xs text-slate-500">クリック {p.clicks}(前 {p.prevClicks}) / CTR {p.ctrPct}% / 順位 {p.position}</div></li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold text-sm mb-2">AI からの流入</h2>
        <p className="text-sm">{s.ai.sessions} 件(前期間 {s.ai.prev} 件)</p>
        <ul className="text-sm">{s.ai.sources.map((a) => <li key={a.source}>{a.source}: {a.sessions}</li>)}</ul>
      </Card>

      <Card>
        <h2 className="font-bold text-sm mb-2">流入の多いページ(入口)</h2>
        <ul className="text-sm divide-y">{s.landing.slice(0, 8).map((l) => <li key={l.path} className="py-1.5 flex justify-between gap-2"><span className="truncate">{l.path}</span><span className="shrink-0 text-slate-500">{l.sessions}訪問 / 成果率 {l.cvrPct}%</span></li>)}</ul>
      </Card>
    </div>
  );
}

const SEV: Record<string, [string, string]> = { block: ["公開不可の疑い", "bg-rose-50 text-rose-700"], review: ["要確認", "bg-amber-50 text-amber-700"], info: ["参考", "bg-slate-100 text-slate-600"] };

export function CompliancePage() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<{ verdict: string; findings: Finding[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      setRes(await api("/compliance/check", { method: "POST", body: { text } }));
    } finally {
      setBusy(false);
    }
  };
  const verdict: Record<string, string> = { block: "公開できない表現の疑いがあります", review: "確認が必要な表現があります", info: "参考情報があります", ok: "検出されませんでした" };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">医療広告チェック</h1>
      <p className="text-sm text-slate-500">公開前の文案を貼り付けてください。ルールベースの簡易チェックで、弁護士・行政の判断の代わりにはなりません。最終判断は人が行います。</p>
      <textarea className="w-full border rounded-xl p-3 min-h-48 bg-white" placeholder="タイトル・見出し・本文を貼り付け" value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={run} disabled={!text.trim() || busy} className="w-full rounded-lg bg-ink text-white py-3 font-semibold disabled:opacity-40">チェックする</button>
      {res && (
        <Card className="space-y-3">
          <div className="font-bold">{verdict[res.verdict]}</div>
          {res.findings.map((f, i) => (
            <div key={i} className="text-sm border-t pt-2">
              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] mr-2 ${SEV[f.severity][1]}`}>{SEV[f.severity][0]}</span>
              <b>{f.label}</b>{f.match && <span className="text-slate-500">「{f.match}」{f.line ? `(${f.line}行目)` : ""}</span>}
              <div className="text-xs text-slate-600 mt-1">{f.advice}</div>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">誤検知は許容し、見逃しを減らす方針です。</p>
        </Card>
      )}
    </div>
  );
}

type Member = { uid: string; email: string; role: string; active: boolean };
const ROLE_LABEL: Record<string, string> = { owner: "オーナー", admin: "管理者", editor: "編集者(承認できる)", viewer: "閲覧のみ" };

function Members() {
  const [list, setList] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const load = async () => setList(await api<Member[]>("/members"));
  const [reqs, setReqs] = useState<{ uid: string; email: string; name: string; company: string }[]>([]);
  const loadReqs = async () => setReqs(await api("/signup-requests"));
  useEffect(() => { void load(); void loadReqs(); }, []);
  const decide = async (uid: string, action: "approve" | "reject", r: string) => {
    setErr("");
    try {
      await api(`/signup-requests/${uid}`, { method: "POST", body: { action, role: r } });
      await Promise.all([load(), loadReqs()]);
    } catch {
      setErr("処理できませんでした。");
    }
  };
  const invite = async () => {
    setErr("");
    setLink("");
    try {
      const r = await api<{ setPasswordLink: string }>("/members", { method: "POST", body: { email, role } });
      setLink(r.setPasswordLink);
      setEmail("");
      await load();
    } catch {
      setErr("追加できませんでした(メール形式・権限を確認してください)。");
    }
  };
  const patch = async (uid: string, body: object) => {
    setErr("");
    try {
      await api(`/members/${uid}`, { method: "PATCH", body });
      await load();
    } catch {
      setErr("変更できませんでした。");
    }
  };
  return (
    <Card className="space-y-3">
      {reqs.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="font-bold text-sm">承認待ちの利用申請({reqs.length}件)</div>
          {reqs.map((r) => (
            <div key={r.uid} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="flex-1 min-w-48">{r.name}{r.company ? `(${r.company})` : ""}<br /><span className="text-xs text-slate-500">{r.email}</span></span>
              <select id={`role-${r.uid}`} defaultValue="viewer" className="border rounded p-1 text-xs">{Object.entries(ROLE_LABEL).filter(([k]) => k !== "owner").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <button className="rounded-md bg-ink text-white text-xs px-3 py-1.5" onClick={() => decide(r.uid, "approve", (document.getElementById(`role-${r.uid}`) as HTMLSelectElement).value)}>承認</button>
              <button className="rounded-md border text-xs px-3 py-1.5" onClick={() => decide(r.uid, "reject", "viewer")}>却下</button>
            </div>
          ))}
        </div>
      )}
      <h2 className="font-bold text-sm">メンバー</h2>
      <ul className="divide-y text-sm">
        {list.map((m) => (
          <li key={m.uid} className="py-2 flex items-center gap-2 flex-wrap">
            <span className={`flex-1 min-w-40 truncate ${m.active ? "" : "line-through text-slate-400"}`}>{m.email}</span>
            <select className="border rounded p-1 text-xs" value={m.role} onChange={(e) => patch(m.uid, { role: e.target.value })}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="text-xs underline" onClick={() => patch(m.uid, { active: !m.active })}>{m.active ? "無効にする" : "有効にする"}</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 flex-wrap">
        <input className="flex-1 min-w-48 border rounded-lg p-2" type="email" placeholder="追加するメールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="border rounded-lg p-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={invite} disabled={!email} className="rounded-lg bg-ink text-white px-4 py-2 text-sm disabled:opacity-40">追加</button>
      </div>
      {link && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2 break-all">
          パスワード設定リンク(本人にだけ共有してください。このメッセージを閉じると再表示できません):<br />{link}
        </div>
      )}
      {err && <p className="text-xs text-rose-600">{err}</p>}
    </Card>
  );
}

export function SettingsPage() {
  const { summary: s, email, role, reload } = useData();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">設定・できること/できないこと</h1>
      <Card>
        <div className="text-sm">ログイン中:{email}(権限: {role})</div>
        <div className="text-sm">対象サイト:{s?.site.name}</div>
        <div className="text-xs text-slate-500">集計更新:{s ? new Date(s.generatedAt).toLocaleString("ja-JP") : "-"}(毎朝4時に自動更新)</div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => void reload()} className="rounded-lg border px-4 py-2 text-sm">再読み込み</button>
          <button onClick={() => signOut(auth)} className="rounded-lg border px-4 py-2 text-sm">ログアウト</button>
        </div>
      </Card>
      {["owner", "admin"].includes(role) && <Members />}
      <Card>
        <h2 className="font-bold text-sm mb-1">このアプリの限界(正直な説明)</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {(s?.limits ?? []).map((l, i) => <li key={i}>{l}</li>)}
          <li>サイトへの変更は自動では行いません。承認した内容を人が実施し、「実施した」を記録します。</li>
          <li>検索順位や施策効果の保証はできません。効果測定は前後比較の傾向であり、他の要因を除いていません。</li>
        </ul>
      </Card>
    </div>
  );
}
