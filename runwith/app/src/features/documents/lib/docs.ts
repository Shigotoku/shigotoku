/** 会社情報からの書類自動作成：フィールド定義と各書類のテンプレート */

export type FieldType = "text" | "date" | "number" | "textarea";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
}

export const FIELDS: Record<string, FieldDef> = {
  companyName: { key: "companyName", label: "商号（会社名）", type: "text" },
  companyKana: { key: "companyKana", label: "商号（フリガナ）", type: "text" },
  postalCode: { key: "postalCode", label: "本店 郵便番号", type: "text", placeholder: "860-0000" },
  address: { key: "address", label: "本店所在地", type: "text" },
  phone: { key: "phone", label: "電話番号", type: "text", placeholder: "096-000-0000" },
  email: { key: "email", label: "メールアドレス", type: "text" },
  repTitle: { key: "repTitle", label: "代表者の肩書", type: "text", placeholder: "代表取締役" },
  repName: { key: "repName", label: "代表者氏名", type: "text" },
  repAddress: { key: "repAddress", label: "代表者の住所", type: "text", hint: "届出書の「代表者住所」に使用（自宅住所）" },
  capital: { key: "capital", label: "資本金（円）", type: "number" },
  foundedDate: { key: "foundedDate", label: "設立年月日", type: "date" },
  fiscalEndMonth: { key: "fiscalEndMonth", label: "決算月（1〜12）", type: "number" },
  businessSummary: { key: "businessSummary", label: "事業内容・事業の目的", type: "textarea" },
  taxOffice: { key: "taxOffice", label: "所轄税務署", type: "text", placeholder: "熊本西税務署", hint: "本店所在地を管轄する税務署（国税庁の税務署検索で確認）" },
  corporateNumber: { key: "corporateNumber", label: "法人番号（13桁）", type: "text", hint: "登記完了後に通知されます" },
  submitDate: { key: "submitDate", label: "提出（作成）日", type: "date" },
  openDate: { key: "openDate", label: "給与支払事務所の開設日", type: "date", hint: "通常は設立日、または最初に給与を支払う事務所を設けた日" },
  payStartDate: { key: "payStartDate", label: "給与の支払を開始する日", type: "date" },
  payHeadcount: { key: "payHeadcount", label: "給与の支給人員（人）", type: "number" },
  meetingDate: { key: "meetingDate", label: "株主総会の開催日", type: "date" },
  meetingPlace: { key: "meetingPlace", label: "開催場所", type: "text", placeholder: "当会社本店" },
  shareholderName: { key: "shareholderName", label: "出席株主（代表株主）氏名", type: "text" },
  shareholderCount: { key: "shareholderCount", label: "総株主数（人）", type: "number" },
  sharesTotal: { key: "sharesTotal", label: "発行済株式総数（株）", type: "number" },
  chairName: { key: "chairName", label: "議長（通常は代表者）", type: "text" },
  compMonthly: { key: "compMonthly", label: "役員報酬の月額（円）", type: "number" },
  compStart: { key: "compStart", label: "報酬の支給開始日", type: "date" },
  compTarget: { key: "compTarget", label: "対象役員", type: "text", placeholder: "代表取締役 ○○ ○○" },
  termNo: { key: "termNo", label: "期（第○期）", type: "number" },
  termStart: { key: "termStart", label: "事業年度 開始日", type: "date" },
  termEnd: { key: "termEnd", label: "事業年度 終了日", type: "date" },
  netProfit: { key: "netProfit", label: "当期純利益（円・赤字はマイナス）", type: "number" },
};

export interface DocCtx {
  v: (key: string) => string; // HTMLエスケープ済み値（未入力は目印）
  raw: (key: string) => string; // 生の値
  yen: (key: string) => string;
  d: (key: string) => string; // 令和表記の日付
  deadline: (key: string, months: number) => string;
}

export interface DocDef {
  id: string;
  title: string;
  category: "届出" | "総会・議事録" | "基本情報";
  summary: string;
  officialNote?: string;
  officialUrl?: string;
  keys: string[];
  build: (c: DocCtx) => string; // 本文HTML
}

const table = (rows: [string, string][]) =>
  `<table>${rows.map(([k, val]) => `<tr><th>${k}</th><td>${val}</td></tr>`).join("")}</table>`;

export const DOCS: DocDef[] = [
  {
    id: "incorporation-notice",
    title: "法人設立届出書（記入用下書き）",
    category: "届出",
    summary: "設立から2か月以内に税務署へ提出。国税庁様式への転記用データ",
    officialNote: "提出は国税庁の所定様式（e-Tax可）で行います。この下書きの内容を転記してください。",
    officialUrl: "https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/hojin/annai/5100_01.htm",
    keys: ["taxOffice", "submitDate", "companyName", "companyKana", "postalCode", "address", "phone", "corporateNumber", "repName", "repAddress", "capital", "foundedDate", "fiscalEndMonth", "businessSummary"],
    build: (c) => `
      <h1>法人設立届出書（下書き）</h1>
      <p class="right">${c.d("submitDate")}</p>
      <p>${c.v("taxOffice")}長 殿</p>
      ${table([
        ["納税地", `〒${c.v("postalCode")}<br>${c.v("address")}<br>電話 ${c.v("phone")}`],
        ["本店又は主たる事務所の所在地", c.v("address")],
        ["（フリガナ）／法人名", `${c.v("companyKana")}<br>${c.v("companyName")}`],
        ["法人番号", c.v("corporateNumber")],
        ["代表者氏名", c.v("repName")],
        ["代表者住所", c.v("repAddress")],
        ["設立年月日", c.d("foundedDate")],
        ["資本金又は出資金の額", c.yen("capital")],
        ["事業年度", `毎年 ${c.v("fiscalEndMonth")} 月末日（第1期：${c.d("foundedDate")} 〜）`],
        ["事業の目的", c.v("businessSummary")],
        ["届出の区分", "新たに設立（内国法人）"],
      ])}
      <p class="note">提出期限：設立の日から2か月以内（${c.deadline("foundedDate", 2)}）。添付：定款等の写し、登記事項証明書など。</p>`,
  },
  {
    id: "blue-return",
    title: "青色申告の承認申請書（記入用下書き）",
    category: "届出",
    summary: "設立から3か月以内（または第1期末日の早い方）に提出。赤字の繰越控除に必須",
    officialNote: "提出は国税庁の所定様式（e-Tax可）で行います。この下書きの内容を転記してください。",
    officialUrl: "https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/hojin/annai/5101_01.htm",
    keys: ["taxOffice", "submitDate", "companyName", "companyKana", "postalCode", "address", "phone", "corporateNumber", "repName", "repAddress", "foundedDate", "businessSummary", "capital"],
    build: (c) => `
      <h1>青色申告の承認申請書（下書き）</h1>
      <p class="right">${c.d("submitDate")}</p>
      <p>${c.v("taxOffice")}長 殿</p>
      ${table([
        ["納税地", `〒${c.v("postalCode")} ${c.v("address")}　電話 ${c.v("phone")}`],
        ["（フリガナ）／法人名", `${c.v("companyKana")}　${c.v("companyName")}`],
        ["法人番号", c.v("corporateNumber")],
        ["代表者氏名・住所", `${c.v("repName")}（${c.v("repAddress")}）`],
        ["設立年月日／資本金", `${c.d("foundedDate")}／${c.yen("capital")}`],
        ["事業種目", c.v("businessSummary")],
        ["青色申告書の提出を受けようとする事業年度", `${c.d("foundedDate")} から始まる事業年度（設立第1期）以後`],
        ["帳簿書類の備付場所", c.v("address")],
        ["記帳の方法", "複式簿記（会計ソフトによる電子帳簿）"],
        ["備付帳簿名", "仕訳帳、総勘定元帳、現金出納帳、預金出納帳、売掛帳、買掛帳、固定資産台帳 ほか"],
        ["特別な記帳方法の採用", "会計ソフト（クラウド会計）を使用。電子帳簿保存法に対応して保存"],
      ])}
      <p class="note">提出期限：設立の日から3か月以内（${c.deadline("foundedDate", 3)}）または第1期の事業年度終了の日のいずれか早い日。承認を受けると欠損金を原則10年間繰り越せます。</p>`,
  },
  {
    id: "salary-office",
    title: "給与支払事務所等の開設届出書（記入用下書き）",
    category: "届出",
    summary: "役員報酬などを支払う場合、開設から1か月以内に提出",
    officialNote: "提出は国税庁の所定様式（e-Tax可）で行います。この下書きの内容を転記してください。",
    officialUrl: "https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/gensen/annai/1649_26.htm",
    keys: ["taxOffice", "submitDate", "companyName", "postalCode", "address", "phone", "corporateNumber", "repName", "repAddress", "openDate", "payStartDate", "payHeadcount"],
    build: (c) => `
      <h1>給与支払事務所等の開設届出書（下書き）</h1>
      <p class="right">${c.d("submitDate")}</p>
      <p>${c.v("taxOffice")}長 殿</p>
      ${table([
        ["届出者（法人）", `${c.v("companyName")}（法人番号 ${c.v("corporateNumber")}）`],
        ["納税地・開設した事務所の所在地", `〒${c.v("postalCode")} ${c.v("address")}　電話 ${c.v("phone")}`],
        ["代表者氏名・住所", `${c.v("repName")}（${c.v("repAddress")}）`],
        ["開設・移転・廃止の別", "開設"],
        ["開設・異動年月日", c.d("openDate")],
        ["開設・異動の事由", "法人設立のため"],
        ["給与支払を開始する年月日", c.d("payStartDate")],
        ["給与の支払を受ける人員", `${c.v("payHeadcount")} 人（役員を含む）`],
      ])}
      <p class="note">提出期限：開設の日から1か月以内（${c.deadline("openDate", 1)}）。</p>`,
  },
  {
    id: "withholding-special",
    title: "源泉所得税の納期の特例の承認申請書（記入用下書き）",
    category: "届出",
    summary: "常時10人未満なら源泉税の納付を年2回にできる",
    officialNote: "提出は国税庁の所定様式（e-Tax可）で行います。この下書きの内容を転記してください。",
    officialUrl: "https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/gensen/annai/1649_27.htm",
    keys: ["taxOffice", "submitDate", "companyName", "postalCode", "address", "phone", "corporateNumber", "repName", "payHeadcount"],
    build: (c) => `
      <h1>源泉所得税の納期の特例の承認に関する申請書（下書き）</h1>
      <p class="right">${c.d("submitDate")}</p>
      <p>${c.v("taxOffice")}長 殿</p>
      ${table([
        ["申請者（法人）", `${c.v("companyName")}（法人番号 ${c.v("corporateNumber")}）`],
        ["給与支払事務所の所在地", `〒${c.v("postalCode")} ${c.v("address")}　電話 ${c.v("phone")}`],
        ["代表者氏名", c.v("repName")],
        ["給与の支払を受ける人員", `${c.v("payHeadcount")} 人（常時10人未満）`],
        ["申請の内容", "給与や退職手当、税理士報酬等に係る源泉所得税の納付を、年2回（1〜6月分は7/10、7〜12月分は翌1/20）にまとめる特例の承認を受けたい"],
      ])}
      <p class="note">承認を受けた月の翌月に支払う給与から適用されます。納付を忘れないよう税務カレンダーに登録してください。</p>`,
  },
  {
    id: "minutes-officer-compensation",
    title: "株主総会議事録（役員報酬の決定）",
    category: "総会・議事録",
    summary: "定期同額給与として損金にするため、設立から3か月以内に決定して議事録を保存",
    keys: ["companyName", "meetingDate", "meetingPlace", "shareholderName", "shareholderCount", "sharesTotal", "chairName", "compTarget", "compMonthly", "compStart"],
    build: (c) => `
      <h1>臨時株主総会議事録</h1>
      <p>1. 日　時　${c.d("meetingDate")}</p>
      <p>2. 場　所　${c.v("meetingPlace")}</p>
      <p>3. 出席状況<br>　総株主数 ${c.v("shareholderCount")} 名、発行済株式総数 ${c.v("sharesTotal")} 株<br>　出席株主 ${c.v("shareholderName")} ほか（全株主出席・議決権の全部を行使可能）</p>
      <p>議長 ${c.v("chairName")} は議長席につき、開会を宣し、上記のとおり定足数を満たしている旨を告げ、議案の審議に入った。</p>
      <h2>議案　役員報酬の決定の件</h2>
      <p>議長は、役員報酬を次のとおり定めたい旨を述べ、その承認を求めたところ、出席株主の全員一致をもってこれを承認可決した。</p>
      ${table([
        ["対象役員", c.v("compTarget")],
        ["報酬月額", `${c.yen("compMonthly")}（定期同額給与）`],
        ["支給開始", c.d("compStart")],
        ["支給方法", "毎月一定の日に同額を支給し、事業年度中は原則として改定しない"],
      ])}
      <p>以上をもって議事を終了したので、議長は閉会を宣した。</p>
      <p>上記の決議を明確にするため、本議事録を作成し、議長及び出席取締役がこれに記名押印する。</p>
      <p class="right">${c.v("companyName")}<br>議長　${c.v("chairName")}　印</p>
      <p class="note">定期同額給与の要件：新設法人は設立の日から3か月以内に決定。期中の増減は原則損金不算入となるため注意。</p>`,
  },
  {
    id: "minutes-annual",
    title: "定時株主総会議事録（計算書類の承認）",
    category: "総会・議事録",
    summary: "決算後に計算書類を承認し、議事録を保存（法人税申告の前提）",
    keys: ["companyName", "termNo", "termStart", "termEnd", "meetingDate", "meetingPlace", "shareholderName", "shareholderCount", "sharesTotal", "chairName", "netProfit"],
    build: (c) => `
      <h1>第${c.v("termNo")}期 定時株主総会議事録</h1>
      <p>1. 日　時　${c.d("meetingDate")}</p>
      <p>2. 場　所　${c.v("meetingPlace")}</p>
      <p>3. 出席状況<br>　総株主数 ${c.v("shareholderCount")} 名、発行済株式総数 ${c.v("sharesTotal")} 株<br>　出席株主 ${c.v("shareholderName")} ほか（全株主出席・議決権の全部を行使可能）</p>
      <p>議長 ${c.v("chairName")} は議長席につき、開会を宣し、上記のとおり総会が適法に成立した旨を告げ、議案の審議に入った。</p>
      <h2>第1号議案　第${c.v("termNo")}期（${c.d("termStart")}から${c.d("termEnd")}まで）計算書類承認の件</h2>
      <p>議長は、当期の貸借対照表、損益計算書、株主資本等変動計算書及び個別注記表を提出して内容を説明し、承認を求めたところ、出席株主の全員一致をもってこれを承認可決した。当期純損益は ${c.yen("netProfit")} である。</p>
      <p>以上をもって議事を終了したので、議長は閉会を宣した。</p>
      <p>上記の決議を明確にするため、本議事録を作成し、議長がこれに記名押印する。</p>
      <p class="right">${c.v("companyName")}<br>議長　${c.v("chairName")}　印</p>
      <p class="note">議事録は本店に10年間備え置く義務があります。決算公告（貸借対照表の公告）も別途必要です。</p>`,
  },
  {
    id: "company-profile",
    title: "会社基本情報シート（銀行・補助金・取引先への提出用）",
    category: "基本情報",
    summary: "口座開設、補助金申請、与信審査などで繰り返し聞かれる情報を1枚に整理",
    keys: ["companyName", "companyKana", "postalCode", "address", "phone", "email", "corporateNumber", "repTitle", "repName", "foundedDate", "capital", "fiscalEndMonth", "payHeadcount", "businessSummary"],
    build: (c) => `
      <h1>会社基本情報</h1>
      ${table([
        ["商号", `${c.v("companyName")}（${c.v("companyKana")}）`],
        ["法人番号", c.v("corporateNumber")],
        ["本店所在地", `〒${c.v("postalCode")} ${c.v("address")}`],
        ["電話／メール", `${c.v("phone")}／${c.v("email")}`],
        ["代表者", `${c.v("repTitle")} ${c.v("repName")}`],
        ["設立年月日", c.d("foundedDate")],
        ["資本金", c.yen("capital")],
        ["決算期", `${c.v("fiscalEndMonth")} 月`],
        ["従業員数（役員含む）", `${c.v("payHeadcount")} 名`],
        ["事業内容", c.v("businessSummary")],
      ])}`,
  },
];

/* ───────── 出力ユーティリティ ───────── */

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br>");

export function toReiwa(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const y = Number(m[1]);
  const era = y >= 2019 ? `令和${y - 2018 === 1 ? "元" : y - 2018}` : `${y}`;
  return `${era}年${Number(m[2])}月${Number(m[3])}日`;
}

export function addMonthsIso(iso: string, months: number): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const lastDay = new Date(Number(m[1]), Number(m[2]) - 1 + months + 1, 0).getDate();
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + months, Math.min(Number(m[3]), lastDay));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STYLE = `
  body{font-family:"Yu Mincho","Hiragino Mincho ProN","MS PMincho",serif;font-size:11pt;line-height:1.8;color:#111;padding:24px 32px;max-width:800px;margin:0 auto}
  h1{text-align:center;font-size:16pt;margin:0 0 16px}
  h2{font-size:12pt;margin:18px 0 6px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border:1px solid #333;padding:6px 10px;vertical-align:top;font-size:10.5pt}
  th{width:32%;background:#f3f4f6;text-align:left;font-weight:600}
  .right{text-align:right}
  .note{font-size:9pt;color:#555;border-top:1px dashed #999;margin-top:20px;padding-top:8px}
  .missing{background:#fde68a;color:#92400e;padding:0 3px;border-radius:2px;font-size:9.5pt}
  @media print{.missing{background:none;color:#000;border-bottom:1px solid #000}}
`;

export function wrapHtml(title: string, body: string) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}

export function toWordHtml(title: string, body: string) {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}
