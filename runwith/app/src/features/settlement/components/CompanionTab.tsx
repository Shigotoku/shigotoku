import { useMemo, useState } from "react";
import {
  AlertCircle, CheckCircle2, Circle, ClipboardList, Copy, Download, ExternalLink, Flag, Plus, Route, Scale, Trash2,
} from "lucide-react";
import { STEPS } from "../lib/content";
import { addDays, fmt, fmtShort, WEEK, yen } from "../lib/dates";
import { downloadText } from "../lib/ics";
import type { FilingRoute, JournalEntry, ReconRow } from "../lib/types";
import { Advice, Card, NumField, type Ctx } from "./ui";

const FREEE_CHECKS = [
  { id: "chk_period", label: "freeeの会計期間が正しい（設立日〜決算日）", hint: "freee会計の事業所設定・会計期間で確認" },
  { id: "chk_unprocessed", label: "未処理の明細・未決済の取引が0件", hint: "「決算サポートアプリ」（無料）で重複・不一致・固定資産の登録漏れを検出" },
  { id: "chk_bank", label: "預金・カードの残高がfreeeと実際で一致（下の照合表）", hint: "不一致の原因は未登録取引・二重登録がほとんど" },
  { id: "chk_receivable", label: "売掛金・未払金・預り金の残高に裏付け資料がある", hint: "請求書・契約書・給与明細などで根拠を説明できる状態に" },
  { id: "chk_setup", label: "設立費用・資本金・代表者の立替払いが登録済み", hint: "第1期は設立時の処理が最もミスしやすい" },
  { id: "chk_asset", label: "10万円以上のパソコン・備品などを固定資産に登録", hint: "30万円未満は少額減価償却資産の特例を検討" },
  { id: "chk_payroll", label: "役員報酬と源泉所得税（預り金）が整合している", hint: "納付済みか、納期の特例の適用有無を確認" },
  { id: "chk_invoice", label: "インボイス登録・消費税の区分設定を確認した", hint: "設立初年度は原則免税（資本金1,000万円以上・登録済みを除く）" },
  { id: "chk_tax_entry", label: "法人税等の仕訳を反映して当期純利益を確定した", hint: "税額確定後に仕訳を入れ、決算書を再出力" },
];

const ROUTES: {
  id: FilingRoute; name: string; cost: string; effort: string; summary: string; pros: string[]; cons: string[];
}[] = [
  {
    id: "software", name: "A. 会計ソフトの申告機能（freee申告など）",
    cost: "年29,800円（スターター・税別）", effort: "◎ 最短",
    summary: "freee会計のデータから法人税・地方税の申告書を作成し、e-Tax・eLTAXで送信",
    pros: ["決算書と申告書が連動し、転記ミスが少ない", "期限まで日数が少なくても間に合いやすい", "翌期以降も同じ手順で使い回せる"],
    cons: ["有料（ただし税理士より大幅に安い）", "電子証明書・eLTAX IDの事前準備が必要"],
  },
  {
    id: "free-etax", name: "B. 無料で電子申告（e-Tax＋eLTAX PCdesk）",
    cost: "0円", effort: "△ 手間大",
    summary: "別表を自分で作成して電子申告（国税はe-Tax、地方税はeLTAXの無料ソフトを利用）",
    pros: ["費用がかからない", "電子申告なので受付結果をすぐ確認できる"],
    cons: ["別表の作成・転記は自己責任で高難度（要確認：e-Taxで法人税の画面入力に対応する範囲）", "準備不足だと期限に間に合わないリスク"],
  },
  {
    id: "paper", name: "C. 紙で提出（国税庁・自治体の様式を印刷）",
    cost: "0円（郵送費のみ）", effort: "△ 手間大",
    summary: "様式をダウンロードして手書き・入力し、税務署・県・市へ郵送または持参",
    pros: ["費用がかからない", "電子証明書やIDの事前準備が不要", "郵送は通信日付印の日が提出日になる（要確認）"],
    cons: ["別表の作成は自力で、正確性の確認手段が少ない", "納税は別途ペイジー・コンビニ納付書などが必要"],
  },
];

const nid = () => Math.random().toString(36).slice(2, 9);

export default function CompanionTab({ ctx }: { ctx: Ctx }) {
  const { term, patchTerm, today, deadline, daysLeft, end, tax, company } = ctx;
  const [text, setText] = useState("");
  const [tag, setTag] = useState<JournalEntry["tag"]>("進捗");
  const [copied, setCopied] = useState(false);

  const done = (id: string) => !!term.done[id];
  const stepsDone = STEPS.filter((s) => done(s.id)).length;
  const nextStep = STEPS.find((s) => !done(s.id));
  const extendLimit = addDays(end, 45); // 法人税の申告期限延長の申請は事業年度終了の翌日から45日以内
  const extendable = today <= extendLimit;

  const toggleCheck = (id: string) => patchTerm({ done: { ...term.done, [id]: !term.done[id] } });
  const journal = term.journal ?? [];

  const addEntry = () => {
    if (!text.trim()) return;
    patchTerm({ journal: [...journal, { id: nid(), at: new Date().toISOString(), text: text.trim(), tag }] });
    setText("");
  };
  const delEntry = (id: string) => patchTerm({ journal: journal.filter((j) => j.id !== id) });

  /* 残高照合 */
  const recon: ReconRow[] = term.recon ?? [
    { id: "r1", name: "普通預金（メイン口座）", bank: 0, freee: 0 },
    { id: "r2", name: "クレジットカード未払", bank: 0, freee: 0 },
    { id: "r3", name: "現金", bank: 0, freee: 0 },
  ];
  const setRecon = (rows: ReconRow[]) => patchTerm({ recon: rows });
  const patchRow = (id: string, p: Partial<ReconRow>) => setRecon(recon.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const reconDiff = recon.reduce((s, r) => s + (r.bank - r.freee), 0);
  const allMatch = recon.every((r) => r.bank === r.freee);

  /* 貸借チェック */
  const bs = term.bs ?? { assets: 0, liabilities: 0, equity: 0 };
  const bsDiff = bs.assets - (bs.liabilities + bs.equity);
  const bsFilled = bs.assets !== 0 || bs.liabilities !== 0 || bs.equity !== 0;
  const expectedEquity = (company?.capitalAmount ?? 0) + (term.pretaxProfit - tax.total);

  /* 期限までの日割り計画 */
  const plan = useMemo(() => {
    const undone = STEPS.filter((s) => !term.done[s.id] && s.offset <= 0);
    if (undone.length === 0 || daysLeft < 0) return [] as { date: Date; items: string[] }[];
    const slots = daysLeft + 1;
    const usable = slots >= 3 ? slots - 1 : slots; // 期限当日は予備日
    const byDay = new Map<number, string[]>();
    undone.forEach((s, k) => {
      const day = Math.min(usable - 1, Math.round((k * (usable - 1)) / Math.max(undone.length - 1, 1)));
      byDay.set(day, [...(byDay.get(day) ?? []), s.title]);
    });
    return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, items]) => ({ date: addDays(today, d), items }));
  }, [term.done, daysLeft, today]);

  const summaryText = () => {
    const lines = [
      `# ${company?.name ?? ""} 第${term.termNo}期 決算の経過まとめ`,
      `作成日：${fmt(today)}`,
      `事業年度：${term.startDate} 〜 ${term.endDate}`,
      `申告・納付期限：${fmt(deadline)}（${daysLeft >= 0 ? `あと${daysLeft}日` : `${-daysLeft}日超過`}）`,
      `進捗：${stepsDone}/${STEPS.length} ステップ完了${nextStep ? `／次にやること：${nextStep.title}` : "／すべて完了"}`,
      `申告ルート：${ROUTES.find((r) => r.id === term.route)?.name ?? "未選択"}`,
      `税額見込み：${yen(tax.total)}（課税所得 ${yen(tax.income)}）`,
      "",
      "## ステップ",
      ...STEPS.map((s) => `- [${done(s.id) ? "x" : " "}] ${s.title}`),
      "",
      "## 経過ログ",
      ...journal.map((j) => `- ${new Date(j.at).toLocaleString("ja-JP")} [${j.tag}] ${j.text}`),
    ];
    return lines.join("\n");
  };
  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* 非対応環境 */ }
  };

  const route = term.route;
  const recommended: FilingRoute = "software";

  return (
    <div className="space-y-6">
      {/* 現在地 */}
      <Card title="現在地と次の一手" icon={<Flag className="h-4 w-4 text-primary-600" />}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] text-slate-500">申告・納付期限</p>
            <p className="text-lg font-bold text-slate-900">{fmt(deadline)}（{WEEK[deadline.getDay()]}）</p>
            <p className={`text-xs font-semibold ${daysLeft <= 7 ? "text-red-600" : "text-slate-500"}`}>
              {daysLeft >= 0 ? `あと${daysLeft}日` : `${-daysLeft}日超過`}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] text-slate-500">ステップ進捗</p>
            <p className="text-lg font-bold text-slate-900">{stepsDone} / {STEPS.length}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-primary-500" style={{ width: `${(stepsDone / STEPS.length) * 100}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4">
            <p className="text-[11px] text-slate-500">次にやること</p>
            <p className="text-sm font-bold text-slate-900">{nextStep ? nextStep.title : "すべて完了です"}</p>
            {nextStep && <p className="mt-0.5 text-[11px] text-slate-500">{nextStep.summary}</p>}
          </div>
        </div>

        <Advice kind={extendable ? "info" : "danger"}>
            {extendable
              ? `法人税の申告期限の延長は、事業年度終了の翌日から45日以内（${fmt(extendLimit)}まで）に申請すれば利用できます。`
              : `法人税の申告期限の延長申請は ${fmt(extendLimit)} で締め切られています。今回は原則の期限（${fmt(deadline)}）までに申告・納付を完了させる必要があります。`}
            納付期限は延長されません。
          </Advice>
        {daysLeft <= 7 && daysLeft >= 0 && (
          <Advice kind="danger">期限まで{daysLeft}日です。下の「期限までの計画」と、申告ルートの選択（A案が最短）を今日決めてください。</Advice>
        )}
      </Card>

      {/* 期限までの計画 */}
      {plan.length > 0 && (
        <Card title="期限までの日割り計画（未完了のステップを自動配分）" icon={<ClipboardList className="h-4 w-4 text-primary-600" />}>
          <ul className="divide-y divide-slate-100">
            {plan.map((p) => (
              <li key={p.date.toISOString()} className="flex items-start gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-xs font-bold text-slate-600">{fmtShort(p.date)}（{WEEK[p.date.getDay()]}）</span>
                <span className="text-slate-800">{p.items.join(" ／ ")}</span>
              </li>
            ))}
            {daysLeft >= 2 && (
              <li className="flex items-start gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-xs font-bold text-slate-400">{fmtShort(deadline)}（{WEEK[deadline.getDay()]}）</span>
                <span className="text-slate-400">予備日（送信エラー・納付の確認）</span>
              </li>
            )}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">土日も含めて配分しています。実際の作業可能日に合わせて調整してください。</p>
        </Card>
      )}

      {/* freeeチェック */}
      <Card title="freee会計の確認チェック" icon={<CheckCircle2 className="h-4 w-4 text-primary-600" />}>
        <ul className="space-y-2">
          {FREEE_CHECKS.map((c) => (
            <li key={c.id}>
              <button onClick={() => toggleCheck(c.id)} className="flex w-full items-start gap-2 text-left">
                {done(c.id) ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                <span>
                  <span className={`text-xs ${done(c.id) ? "text-slate-400 line-through" : "text-slate-800"}`}>{c.label}</span>
                  <span className="block text-[11px] text-slate-400">{c.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-slate-500">
          {FREEE_CHECKS.filter((c) => done(c.id)).length} / {FREEE_CHECKS.length} 確認済み。freeeの「年度締め」は、申告処理をすべて終えてから行ってください。
        </p>
      </Card>

      {/* 残高照合 */}
      <Card title="残高の照合（通帳・カード明細 と freee）" icon={<Scale className="h-4 w-4 text-primary-600" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2">口座・科目</th><th className="pr-2">決算日時点の実際の残高</th>
                <th className="pr-2">freeeの残高</th><th className="pr-2 text-right">差額</th><th />
              </tr>
            </thead>
            <tbody>
              {recon.map((r) => {
                const diff = r.bank - r.freee;
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2">
                      <input value={r.name} onChange={(e) => patchRow(r.id, { name: e.target.value })}
                        className="w-full rounded border border-slate-200 px-2 py-1" />
                    </td>
                    <td className="pr-2"><input type="number" value={r.bank} onChange={(e) => patchRow(r.id, { bank: Number(e.target.value) || 0 })}
                      className="w-full rounded border border-slate-200 px-2 py-1" /></td>
                    <td className="pr-2"><input type="number" value={r.freee} onChange={(e) => patchRow(r.id, { freee: Number(e.target.value) || 0 })}
                      className="w-full rounded border border-slate-200 px-2 py-1" /></td>
                    <td className={`pr-2 text-right font-bold tabular-nums ${diff === 0 ? "text-emerald-600" : "text-red-600"}`}>{diff === 0 ? "一致" : yen(diff)}</td>
                    <td><button onClick={() => setRecon(recon.filter((x) => x.id !== r.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button onClick={() => setRecon([...recon, { id: nid(), name: "", bank: 0, freee: 0 }])}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200">
            <Plus className="h-3 w-3" /> 行を追加
          </button>
          <span className={`text-xs font-medium ${allMatch ? "text-emerald-600" : "text-red-600"}`}>
            {allMatch ? "すべて一致しています" : `差額合計 ${yen(reconDiff)}：未登録取引・二重登録・日付のずれを確認`}
          </span>
        </div>
      </Card>

      {/* 貸借チェック */}
      <Card title="決算書の整合チェック（freeeの貸借対照表の数値を入力）">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumField label="資産の部 合計" value={bs.assets} onChange={(n) => patchTerm({ bs: { ...bs, assets: n } })} />
          <NumField label="負債の部 合計" value={bs.liabilities} onChange={(n) => patchTerm({ bs: { ...bs, liabilities: n } })} />
          <NumField label="純資産の部 合計" value={bs.equity} onChange={(n) => patchTerm({ bs: { ...bs, equity: n } })} />
        </div>
        {bsFilled && (
          <Advice kind={bsDiff === 0 ? "info" : "danger"}>
            {bsDiff === 0 ? "資産 ＝ 負債 ＋ 純資産 が成り立っています。" : `資産と（負債＋純資産）が ${yen(Math.abs(bsDiff))} ずれています。仕訳漏れ・年度の設定を確認してください。`}
          </Advice>
        )}
        {term.termNo === 1 && (
          <p className="mt-2 text-[11px] text-slate-500">
            第1期の目安：純資産 ≒ 資本金（{yen(company?.capitalAmount ?? 0)}）＋ 当期純利益（税引後の見込み {yen(term.pretaxProfit - tax.total)}）＝ {yen(expectedEquity)}。
            資本準備金・増資があれば差が出ます。
          </p>
        )}
      </Card>

      {/* 申告ルート */}
      <Card title="申告ルートを選ぶ" icon={<Route className="h-4 w-4 text-primary-600" />}>
        <div className="grid gap-3 md:grid-cols-3">
          {ROUTES.map((r) => (
            <button key={r.id} onClick={() => patchTerm({ route: r.id })}
              className={`rounded-xl border p-4 text-left transition-all ${route === r.id ? "border-primary-400 bg-primary-50/50 ring-1 ring-primary-200" : "border-slate-200 hover:border-primary-200"}`}>
              <p className="text-sm font-bold text-slate-900">{r.name}{r.id === recommended && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">おすすめ</span>}</p>
              <p className="mt-1 text-xs font-semibold text-primary-700">{r.cost}／手間 {r.effort}</p>
              <p className="mt-1 text-[11px] text-slate-600">{r.summary}</p>
              <ul className="mt-2 space-y-0.5 text-[11px] text-emerald-700">{r.pros.map((p) => <li key={p}>＋ {p}</li>)}</ul>
              <ul className="mt-1 space-y-0.5 text-[11px] text-red-600">{r.cons.map((p) => <li key={p}>－ {p}</li>)}</ul>
            </button>
          ))}
        </div>
        <Advice kind="tip">
          「できるだけ無料」でも、決算書と申告書が連動するA案の年29,800円は、税理士費用（年10〜30万円）より大幅に低コストです。初回で日数が少ない場合は特に有利です。
          2期目以降に余裕ができたらB案への切り替えも検討できます。
        </Advice>
        {route && route !== "software" && (
          <Advice kind="warn">B・C案は別表の作成・転記がすべて自己責任です。判断に迷う論点（設立費用・役員取引・少額資産）だけ、税理士のスポット相談（1時間数千円〜）を併用すると安心です。</Advice>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="https://www.e-tax.nta.go.jp/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-200">e-Tax <ExternalLink className="h-3 w-3" /></a>
          <a href="https://www.eltax.lta.go.jp/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-200">eLTAX <ExternalLink className="h-3 w-3" /></a>
          <a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/hojin.htm" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-200">国税庁 法人税の情報 <ExternalLink className="h-3 w-3" /></a>
        </div>
      </Card>

      {/* 電子申告の事前準備の注意 */}
      <Card title="⚠ 電子申告（e-Tax・eLTAX）の事前準備に注意" icon={<AlertCircle className="h-4 w-4 text-red-500" />}>
        <Advice kind="danger">
          e-Taxの無料利用（B案）は、電子証明書とeLTAX IDの準備が期限に間に合わない恐れがあります。残り日数が少ない場合は、準備が不要な紙提出（C案）か、A案（freee申告）も併せて検討してください。
        </Advice>
        <ul className="mt-3 space-y-2 text-xs text-slate-700">
          <li>・<b>電子証明書</b>：法人の電子申告には、電子証明書（商業登記電子証明書、または代表者のマイナンバーカード等）が必要になる場合があります。商業登記電子証明書は法務局への申請と発行に日数がかかります。<span className="text-slate-400">（利用できる証明書の種類・発行日数は要確認）</span></li>
          <li>・<b>e-Tax</b>：利用開始には、事前にe-Tax利用開始の届出（オンライン）とID・パスワードの取得が必要です。</li>
          <li>・<b>eLTAX</b>：地方税の電子申告には、利用届出とID・パスワード取得が必要です。県・市の届出先や、手続きに日数がかかる場合があります。<span className="text-slate-400">（所要日数は要確認）</span></li>
          <li>・<b>納付</b>：納付期限は延長されません。電子申告と別に、ペイジー・ダイレクト・クレジット納付・納付書（金融機関やコンビニ）の方法を決めておきましょう。</li>
          <li>・<b>確認のしかた</b>：すでにIDや証明書があるか、メディトクの届出書類や代表者の手元を今日中に確認し、無ければ今日のうちに申請して、並行して紙提出の準備も進めると安全です。</li>
        </ul>
      </Card>

      {/* freee申告まとめ */}
      <Card title="freee申告（A案）のまとめ" icon={<Route className="h-4 w-4 text-primary-600" />}>
        <ul className="space-y-1.5 text-xs text-slate-700">
          <li>・<b>できること</b>：freee会計の仕訳データから、決算書と法人税・地方税の申告書を作成し、e-Tax・eLTAXで電子申告します。</li>
          <li>・<b>料金</b>：スターター年29,800円（税別）。<span className="text-slate-400">（最新の料金・プランは公式で要確認）</span></li>
          <li>・<b>画面の流れ</b>：「決算申告」→「決算書」で決算書を確認 → 「法人税申告書」で申告書を作成 → 電子申告（地方税含む）→ 納付 → 年度締め。</li>
          <li>・<b>事前準備</b>：e-Tax・eLTAXの利用届出（ID）と、電子申告に使う証明書の準備は、freeeを使う場合も必要になります。freee側で連携設定を行います。</li>
          <li>・<b>第1期のつまずきやすい点</b>：設立費用・資本金・代表者の立替払い、法人税等の仕訳の反映、会計期間の設定。</li>
          <li>・<b>無料の補助</b>：「決算サポートアプリ」で、重複・不一致・固定資産の登録漏れなどを事前に検出できます。</li>
        </ul>
        <Advice kind="tip">
          今日中にやること：①freeeの確認チェックを終える → ②IDや証明書の有無を確認し、無ければ申請する → ③決算書を確定して申告書を作成 → ④納付方法を決める。
        </Advice>
      </Card>

      {/* 経過ログ */}
      <Card title="経過ログ（決算の記録）" icon={<ClipboardList className="h-4 w-4 text-primary-600" />}>
        <div className="flex flex-wrap gap-2">
          <select value={tag} onChange={(e) => setTag(e.target.value as JournalEntry["tag"])} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
            {(["進捗", "課題", "判断", "完了"] as const).map((t) => <option key={t}>{t}</option>)}
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEntry()}
            placeholder="例：freeeの預金残高とA銀行が一致。クレジットカード未払に差額あり"
            className="min-w-[240px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button onClick={addEntry} className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700">
            <Plus className="h-3.5 w-3.5" /> 記録
          </button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {[...journal].reverse().map((j) => (
            <li key={j.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                j.tag === "課題" ? "bg-red-100 text-red-700" : j.tag === "完了" ? "bg-emerald-100 text-emerald-700" : j.tag === "判断" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{j.tag}</span>
              <span className="flex-1 text-slate-800">{j.text}</span>
              <span className="shrink-0 text-[10px] text-slate-400">{new Date(j.at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              {!j.auto && <button onClick={() => delEntry(j.id)} className="shrink-0 text-slate-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>}
            </li>
          ))}
          {journal.length === 0 && <li className="text-xs text-slate-400">まだ記録がありません。ステップを完了すると自動で記録され、気づきや判断は手動で追加できます。</li>}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
            <Copy className="h-3.5 w-3.5" /> {copied ? "コピーしました" : "経過まとめをコピー"}
          </button>
          <button onClick={() => downloadText(`決算の経過_第${term.termNo}期.md`, summaryText(), "text/markdown")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
            <Download className="h-3.5 w-3.5" /> Markdownで保存
          </button>
        </div>
        {!allMatch && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-600"><AlertCircle className="h-3 w-3" />残高照合に差額があります。解消したらログに残しておきましょう。</p>
        )}
      </Card>
    </div>
  );
}
