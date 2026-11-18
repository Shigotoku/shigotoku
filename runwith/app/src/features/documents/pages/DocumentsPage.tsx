import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, FileDown, FileText, Printer } from "lucide-react";
import { useCompanyStore } from "../../../store/company";
import { useAuthStore } from "../../../store/auth";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";
import { useFiscalEndMonth } from "../../../hooks/useFiscalEndMonth";
import { getStorageJson } from "../../../lib/companyStorage";
import { calcTerm, type SettlementState } from "../../settlement/lib/types";
import { downloadText } from "../../settlement/lib/ics";
import { DOCS, FIELDS, addMonthsIso, esc, toReiwa, toWordHtml, wrapHtml, type DocCtx } from "../lib/docs";

const EMPTY: Record<string, string> = {};
const STORAGE_KEY = "doc-values-v1";

export default function DocumentsPage() {
  const company = useCompanyStore((s) => s.company);
  const isDemo = useAuthStore((s) => s.isDemo);
  const [values, setValues] = useCompanyStorageState<Record<string, string>>(STORAGE_KEY, EMPTY);
  const [fiscalEnd] = useFiscalEndMonth();
  const [docId, setDocId] = useState(DOCS[0].id);
  const [term, setTerm] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  /* 決算・申告ナビの当期データを初期値に使う */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getStorageJson<SettlementState>("settlement-v2", company?.id, isDemo);
        if (!s || cancelled) return;
        const key = s.currentEnd && s.terms[s.currentEnd] ? s.currentEnd : Object.keys(s.terms).sort().pop();
        const t = key ? s.terms[key] : undefined;
        if (!t) return;
        const r = calcTerm(t, company?.capitalAmount ?? 0, s.rates);
        setTerm({
          termNo: String(t.termNo), termStart: t.startDate, termEnd: t.endDate,
          netProfit: String(t.pretaxProfit - r.total),
        });
      } catch { /* 未設定 */ }
    })();
    return () => { cancelled = true; };
  }, [company?.id, company?.capitalAmount, isDemo]);

  const defaults = useMemo<Record<string, string>>(() => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const founded = company?.foundedDate?.slice(0, 10) ?? "";
    const rep = company?.representativeName ?? "";
    const zip = company?.postalCode ?? "";
    return {
      companyName: company?.name ?? "",
      companyKana: company?.nameKana ?? "",
      postalCode: zip,
      address: company?.address ?? "",
      repTitle: "代表取締役",
      repName: rep,
      capital: company?.capitalAmount ? String(company.capitalAmount) : "",
      foundedDate: founded,
      fiscalEndMonth: String(fiscalEnd),
      businessSummary: company?.description || company?.industry || "",
      submitDate: iso,
      openDate: founded,
      payStartDate: founded,
      payHeadcount: String(company?.employeeCount ?? 1),
      meetingPlace: "当会社本店",
      shareholderName: rep,
      shareholderCount: "1",
      chairName: rep,
      compTarget: rep ? `代表取締役 ${rep}` : "",
      compStart: founded,
      ...term,
    };
  }, [company, fiscalEnd, term]);

  const raw = (key: string) => (values[key] ?? "").trim() || defaults[key] || "";
  const doc = DOCS.find((d) => d.id === docId) ?? DOCS[0];
  const missingOf = doc.keys.filter((k) => !raw(k));

  const ctx: DocCtx = {
    raw,
    v: (k) => (raw(k) ? esc(raw(k)) : `<span class="missing">［${FIELDS[k]?.label ?? k}］</span>`),
    yen: (k) => (raw(k) && !Number.isNaN(Number(raw(k))) ? `${Number(raw(k)).toLocaleString()}円` : `<span class="missing">［${FIELDS[k]?.label ?? k}］</span>`),
    d: (k) => toReiwa(raw(k)) || `<span class="missing">［${FIELDS[k]?.label ?? k}］</span>`,
    deadline: (k, months) => toReiwa(addMonthsIso(raw(k), months)) || `<span class="missing">［${FIELDS[k]?.label ?? k}］</span>`,
  };

  const body = doc.build(ctx);
  const html = wrapHtml(doc.title, body);

  const print = () => frameRef.current?.contentWindow?.print();
  const word = () => downloadText(`${doc.title}.doc`, toWordHtml(doc.title, body), "application/msword");
  const copy = async () => {
    const text = new DOMParser().parseFromString(html, "text/html").body.innerText
      ?? new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* 非対応環境 */ }
  };

  const grouped = (["届出", "総会・議事録", "基本情報"] as const).map((c) => ({ c, docs: DOCS.filter((d) => d.category === c) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">書類自動作成</h1>
        <p className="mt-1 text-sm text-slate-500">
          会社情報から届出書の下書き・議事録・会社基本情報シートを自動で作成します。一度入力した情報は他の書類にも使い回されます。
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          {grouped.map(({ c, docs }) => (
            <div key={c}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{c}</p>
              <div className="space-y-1">
                {docs.map((d) => (
                  <button key={d.id} onClick={() => setDocId(d.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      d.id === docId ? "border-primary-300 bg-primary-50" : "border-slate-200 bg-white hover:border-primary-200"}`}>
                    <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><FileText className="h-3.5 w-3.5 text-primary-600" />{d.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{d.summary}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">{doc.title}</h2>
              {missingOf.length === 0 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" />入力済み</span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><AlertCircle className="h-4 w-4" />未入力 {missingOf.length}項目</span>
              )}
            </div>
            {doc.officialNote && (
              <div className="mb-3 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                {doc.officialNote}
                {doc.officialUrl && (
                  <a href={doc.officialUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 font-medium underline">
                    国税庁の様式 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {doc.keys.map((k) => {
                const f = FIELDS[k];
                const val = values[k] ?? "";
                const isDefault = !val.trim() && !!defaults[k];
                const empty = !raw(k);
                const common = `mt-1 w-full rounded-lg border px-3 py-2 text-sm ${empty ? "border-amber-300 bg-amber-50/50" : "border-slate-200"}`;
                return (
                  <label key={k} className={`text-xs text-slate-600 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                    {f.label}
                    {f.type === "textarea" ? (
                      <textarea rows={2} value={val} placeholder={defaults[k] || f.placeholder}
                        onChange={(e) => setValues((p) => ({ ...p, [k]: e.target.value }))} className={common} />
                    ) : (
                      <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        value={val || (f.type === "date" ? defaults[k] ?? "" : "")}
                        placeholder={defaults[k] || f.placeholder}
                        onChange={(e) => setValues((p) => ({ ...p, [k]: e.target.value }))} className={common} />
                    )}
                    {f.hint && <span className="mt-0.5 block text-[10px] text-slate-400">{f.hint}</span>}
                    {isDefault && <span className="mt-0.5 block text-[10px] text-primary-500">会社情報・他の機能から自動入力</span>}
                  </label>
                );
              })}
            </div>
            {missingOf.some((k) => ["companyName", "address", "repName", "capital", "foundedDate"].includes(k)) && (
              <p className="mt-3 text-[11px] text-slate-500">
                会社名・住所・代表者・資本金・設立日は <Link to="/settings" className="text-primary-600 underline">設定</Link> に登録すると、すべての書類に自動で入ります。
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-sm font-bold text-slate-900">プレビュー</h2>
              <button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700">
                <Printer className="h-3.5 w-3.5" /> 印刷／PDF保存
              </button>
              <button onClick={word} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
                <FileDown className="h-3.5 w-3.5" /> Word(.doc)
              </button>
              <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
                <Copy className="h-3.5 w-3.5" /> {copied ? "コピーしました" : "テキストをコピー"}
              </button>
            </div>
            <iframe ref={frameRef} title="preview" srcDoc={html} sandbox="allow-same-origin allow-modals"
              className="h-[620px] w-full rounded-xl border border-slate-200 bg-white" />
            <p className="mt-2 text-[11px] text-slate-400">
              黄色の［　］は未入力の項目です（印刷時は下線になります）。本書面は作成支援ツールによる下書きで、法的助言ではありません。提出前に内容を確認し、必要に応じて税理士・司法書士に確認してください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
