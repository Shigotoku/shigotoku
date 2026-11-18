import { Landmark, Percent } from "lucide-react";
import { calcConsumption, DEEMED_RATES, INTERIM_KEYS } from "../lib/taxEngine";
import { yen, fmt } from "../lib/dates";
import { Advice, Card, NumField, Row, type Ctx } from "./ui";

export default function TaxTab({ ctx }: { ctx: Ctx }) {
  const { state, patchRoot, term, patchTerm, tax, months, deadline, capital } = ctx;
  const paid = INTERIM_KEYS.reduce((s, k) => s + term.interimPaid[k], 0);
  const due = tax.total - paid;
  const cons = calcConsumption(term.taxableSales ?? 0, term.taxablePurchases ?? 0, term.simpleType ?? 0);
  const rates = state.rates;
  const setRate = (p: Partial<typeof rates>) => patchRoot({ rates: { ...rates, ...p } });

  return (
    <div className="space-y-6">
      <Card title="所得の入力（会計ソフトの数値を転記）" icon={<Landmark className="h-4 w-4 text-primary-600" />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumField label="税引前当期純利益（円）" value={term.pretaxProfit} onChange={(n) => patchTerm({ pretaxProfit: n })} hint="赤字はマイナスで入力" />
          <NumField label="加算（損金不算入など）" value={term.addBack} onChange={(n) => patchTerm({ addBack: n })} hint="交際費超過・役員給与否認・減価償却超過など" />
          <NumField label="減算（益金不算入など）" value={term.deduct} onChange={(n) => patchTerm({ deduct: n })} hint="受取配当等・事業税認容など" />
          <NumField label="期首の繰越欠損金" value={term.carryLoss} onChange={(n) => patchTerm({ carryLoss: n })} hint="前期から自動で引き継がれます" />
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          事業年度 {months}か月分で計算。資本金 {yen(capital)}（会社設定より）。
          {tax.largeCompany && " ※ 資本金1億円超は外形標準課税・欠損金控除50%制限などで本計算と異なります。"}
        </p>
      </Card>

      <Card title="消費税の概算（課税事業者の場合）" icon={<Percent className="h-4 w-4 text-primary-600" />}>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumField label="課税売上高（税抜・円）" value={term.taxableSales ?? 0} onChange={(n) => patchTerm({ taxableSales: n })} />
          <NumField label="課税仕入高（税抜・円）" value={term.taxablePurchases ?? 0} onChange={(n) => patchTerm({ taxablePurchases: n })} hint="原則課税のとき使用" />
          <label className="text-xs text-slate-600">
            計算方式
            <select value={term.simpleType ?? 0} onChange={(e) => patchTerm({ simpleType: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value={0}>原則課税</option>
              {Object.entries(DEEMED_RATES).map(([k, v]) => (
                <option key={k} value={k}>簡易課税：{v.label}（みなし仕入率{v.rate * 100}%）</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 divide-y divide-slate-100">
          <Row label="売上に係る消費税（10%）" value={yen(cons.outputTax)} />
          <Row label={(term.simpleType ?? 0) > 0 ? "控除対象仕入税額（みなし仕入率）" : "控除対象仕入税額"} value={yen(cons.inputTax)} />
          <Row label={cons.payable >= 0 ? "納付税額の見込み" : "還付見込み"} value={yen(Math.abs(cons.payable))} strong />
          <Row sub label="うち消費税（国 7.8%）" value={yen(cons.national)} />
          <Row sub label="うち地方消費税（2.2%）" value={yen(cons.localTax)} />
        </div>
        <Advice kind="warn">
          標準税率10%のみの概算です（軽減税率8%・非課税・不課税・インボイス経過措置は未反映）。簡易課税は事前の届出が必要で、適用開始・取りやめの時期に制限があります。免税事業者かどうかは「進め方」タブの判定を確認してください。
        </Advice>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="税額の見込み" icon={<Percent className="h-4 w-4 text-primary-600" />}>
          <div className="divide-y divide-slate-100">
            <Row label="課税所得（千円未満切捨）" value={yen(tax.income)} strong />
            {tax.lossUsed > 0 && <Row sub label="うち繰越欠損金の控除" value={`▲${yen(tax.lossUsed)}`} />}
            <Row label="法人税" value={yen(tax.corp)} />
            <Row label="地方法人税（法人税×10.3%）" value={yen(tax.local)} />
            <Row label="法人事業税（所得割）" value={yen(tax.biz)} />
            <Row label="特別法人事業税（事業税×37%）" value={yen(tax.special)} />
            <Row label={`法人県民税 法人税割（${rates.pref}%）`} value={yen(tax.pref)} />
            <Row label={`法人市民税 法人税割（${rates.city}%）`} value={yen(tax.city)} />
            <Row label="県民税 均等割（月割）" value={yen(tax.prefEqual)} />
            <Row label="市民税 均等割（月割）" value={yen(tax.cityEqual)} />
            <Row label="税額合計" value={yen(tax.total)} strong />
            <Row label="中間納付済み額" value={`▲${yen(paid)}`} />
            <Row label={due >= 0 ? "今回の納付見込額" : "還付見込額"} value={yen(Math.abs(due))} strong />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">税務署</p><p className="font-bold text-slate-900">{yen(tax.national)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">都道府県</p><p className="font-bold text-slate-900">{yen(tax.prefTotal)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">市区町村</p><p className="font-bold text-slate-900">{yen(tax.cityTotal)}</p></div>
          </div>
          {tax.income > 0 && (
            <p className="mt-3 text-[11px] text-slate-500">所得に対する税負担率：約 {(tax.effectiveRate * 100).toFixed(1)}%</p>
          )}
          <Advice kind="info">納付期限：{fmt(deadline)}。資金繰りに織り込み、現預金から確保しておきましょう。</Advice>
          {tax.nextCarryLoss > 0 && (
            <Advice kind="tip">翌期へ繰り越される欠損金：{yen(tax.nextCarryLoss)}（青色申告の承認が前提。「次の期を始める」で自動的に引き継ぎます）</Advice>
          )}
        </Card>

        <Card title="税率・均等割の設定（自治体ごとに異なります）">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField label="県民税 法人税割（%）" value={rates.pref} step={0.1} onChange={(n) => setRate({ pref: n })} hint="標準1.0%" />
            <NumField label="市民税 法人税割（%）" value={rates.city} step={0.1} onChange={(n) => setRate({ city: n })} hint="標準6.0%（超過税率の自治体あり）" />
            <NumField label="県民税 均等割（年額）" value={rates.prefEqual} onChange={(n) => setRate({ prefEqual: n })} hint="資本金1,000万円以下・従業者50人以下で2.1万円など" />
            <NumField label="市民税 均等割（年額）" value={rates.cityEqual} onChange={(n) => setRate({ cityEqual: n })} hint="同条件で5〜6万円が目安" />
          </div>
          <Advice kind="warn">
            本計算は資本金1億円以下の中小法人の標準的な税率ベースの概算です。軽減税率の適用（年800万円以下15%）、事業税の標準税率（3.5/5.3/7.0%）、地方法人税10.3%、特別法人事業税37%を使用。
            各種特別措置（賃上げ促進税制・研究開発税制等）、事業税の超過税率、事務所が複数自治体にある場合の分割は反映していません。申告前に会計ソフト・公式情報で最終確認してください。
          </Advice>
          <p className="mt-3 text-[11px] text-slate-500">
            事業税は支払った年度の損金に算入されるため、今期の納付額は翌期の所得計算で減算（認容）できます。
          </p>
        </Card>
      </div>
    </div>
  );
}
