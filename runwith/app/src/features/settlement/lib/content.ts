export interface Step {
  id: string;
  title: string;
  offset: number; // 申告期限から何日前を目標にするか
  summary: string;
  details: string[];
  firstTerm?: string[];
  tips?: string[];
  warnings?: string[];
  links?: { label: string; url: string }[];
}

export const STEPS: Step[] = [
  {
    id: "books", title: "① 帳簿を確認する", offset: -17,
    summary: "会計ソフトの残高と通帳・カードの残高を一致させる",
    details: [
      "会計期間が正しいか確認",
      "銀行口座・カードの残高と会計ソフトの残高が一致しているか確認",
      "未登録の取引・重複登録がないか確認（月次でAIチェックしていれば短時間で済みます）",
      "売掛金・買掛金・未払金・預り金の残高と実態の一致を確認",
    ],
    firstTerm: ["資本金の入金、設立費用、代表者の立替払いを重点チェック"],
    tips: ["月次で帳簿を整えておけば、この工程は「最終確認」だけになります（月次タブ参照）"],
  },
  {
    id: "adjust", title: "② 決算整理を行う", offset: -13,
    summary: "減価償却・未払金・前払費用などの期末調整",
    details: [
      "減価償却（10万円以上の資産）、少額減価償却資産の特例（30万円未満）の適用検討",
      "未払費用・前払費用・未収収益の計上",
      "役員報酬と源泉所得税の納付状況の確認（定期同額給与のルール）",
      "在庫・仮払金・仮受金・立替金の整理、貸倒れの確認",
      "補助金・助成金の収益計上時期と圧縮記帳の要否",
    ],
    firstTerm: ["設立費用（登録免許税・定款認証費用など）の処理方法を決める（繰延資産 or 一括費用）"],
    warnings: ["役員との金銭のやり取り（貸付・借入・立替）は税務上の論点になりやすい項目です"],
  },
  {
    id: "statements", title: "③ 決算書を作る", offset: -10,
    summary: "貸借対照表・損益計算書・株主資本等変動計算書・個別注記表",
    details: [
      "会計ソフトで貸借対照表（B/S）・損益計算書（P/L）を出力",
      "株主資本等変動計算書、個別注記表も作成（会社法上の計算書類）",
      "「税額計算」タブで見込税額を確認し、法人税等の仕訳を反映して当期純利益を確定",
    ],
  },
  {
    id: "tax-return", title: "④ 申告書を作る", offset: -5,
    summary: "法人税・地方法人税・県税・市税の申告書と添付書類",
    details: [
      "法人税・地方法人税（税務署）、事業税・特別法人事業税・県民税（県）、市民税（市）の申告書を作成",
      "別表・勘定科目内訳明細書・事業概況説明書などの添付書類（下のチェックリスト参照）",
      "赤字でも申告は必要（均等割は赤字でも発生）",
      "中間申告で納付済みの税額は、確定申告で差し引く",
    ],
    tips: ["申告書作成は会計ソフトの申告機能を使うと決算書と連動して楽です。税額は本アプリの「税額計算」と突き合わせるとミスに気づけます"],
  },
  {
    id: "file-pay", title: "⑤ 電子申告・納税する", offset: -3,
    summary: "国税はe-Tax、地方税はeLTAXで送信し、納税まで完了させる",
    details: [
      "送信後は受信通知（受付結果）で正常受付を確認",
      "納税は申告とは別。ダイレクト納付・ペイジー・クレジットカード納付などで期限内に完了",
      "申告書の控え・受信通知を7年分（青色欠損金は10年）保存",
    ],
    warnings: ["初めての電子申告は事前準備（ID取得・証明書）に数日〜1週間かかることがあります。下の準備チェックを先に進めてください"],
    links: [
      { label: "e-Tax（国税庁）", url: "https://www.e-tax.nta.go.jp/" },
      { label: "eLTAX（地方税）", url: "https://www.eltax.lta.go.jp/" },
    ],
  },
  {
    id: "company-law", title: "⑥ 会社法上の手続き", offset: 0,
    summary: "株主総会での決算承認・議事録・決算公告",
    details: [
      "定時株主総会で計算書類を承認（議事録を作成・保存）",
      "決算公告：官報／日刊紙／電子公告のいずれか（定款の公告方法を確認）",
      "電子公告なら自社サイト掲載で低コスト",
      "取締役の任期（原則2年、非公開会社は最長10年）と役員変更登記の期限（2週間以内）を確認",
    ],
    tips: ["公告方法が「官報」だと費用がかかるため、電子公告への変更も検討できます"],
  },
  {
    id: "close-year", title: "⑦ 年度締め・翌期の準備", offset: 1,
    summary: "申告完了後に会計ソフトで年度締め、次の期へ",
    details: [
      "申告処理をすべて終えてから会計ソフトの年度締めを実行",
      "本アプリの「履歴・カレンダー」で「次の期を始める」を押し、繰越欠損金と前期税額を引き継ぐ",
      "中間申告の要否と金額を「中間申告」タブで確認し、納付資金を確保",
      "カレンダーを書き出して年間の期限を管理",
    ],
    warnings: ["先に年度締めをすると申告書との連携に支障が出るソフトがあります"],
  },
];

export const ATTACHMENTS = [
  { id: "att_main", label: "申告書（別表一・四・五(一)(二) など）" },
  { id: "att_fs", label: "貸借対照表・損益計算書・株主資本等変動計算書・個別注記表" },
  { id: "att_detail", label: "勘定科目内訳明細書" },
  { id: "att_gaikyo", label: "法人事業概況説明書" },
  { id: "att_tokusoku", label: "適用額明細書（租税特別措置を使う場合）" },
  { id: "att_local", label: "地方税の申告書（県・市。eLTAXで一括送信可）" },
  { id: "att_tax", label: "消費税申告書（課税事業者の場合）" },
  { id: "att_minutes", label: "株主総会議事録・決算承認の記録（社内保管）" },
];

export const PREP_ITEMS = [
  { id: "prep_etax_id", label: "e-Tax：法人の利用者識別番号を取得（開始届出書を提出）" },
  { id: "prep_cert", label: "電子証明書を用意（代表者のマイナンバーカード or 商業登記電子証明書）" },
  { id: "prep_eltax", label: "eLTAX：利用届出を行い、利用者IDを取得（県・市の届出も）" },
  { id: "prep_pay", label: "納付手段を決める（ダイレクト納付の届出／ペイジー／クレジットカード）" },
  { id: "prep_soft", label: "会計ソフトのe-Tax・eLTAX連携設定を済ませる" },
];

/* ───────── 月次ルーティン ───────── */
export interface MonthlyTask {
  id: string;
  label: string;
  ai?: string; // 使うAIプロンプトID
  note: string;
}

export const MONTHLY_TASKS: MonthlyTask[] = [
  { id: "m_import", label: "銀行・カード明細を取り込み、自動仕訳を確認", ai: "journal", note: "会計ソフトの自動登録ルールを育てると毎月の作業が減ります" },
  { id: "m_receipt", label: "領収書・請求書をスマホ撮影／電子保存（電帳法対応）", note: "OCR＋自動仕訳に任せ、紙は持たない運用に" },
  { id: "m_unclear", label: "不明な取引・未処理の取引をゼロにする", ai: "journal", note: "AIに勘定科目の候補と理由を出させ、人が承認" },
  { id: "m_ar", label: "売掛金の入金消込・請求書発行（インボイス対応）", note: "請求書発行ツールと会計ソフトを連携" },
  { id: "m_review", label: "月次試算表をレビュー（前月比・前年比・予算比）", ai: "monthly", note: "AIに差異の要因と気づきを要約させる" },
  { id: "m_cash", label: "資金繰り・ランウェイを確認", ai: "cash", note: "納税予定額（本アプリの税額計算）を織り込む" },
  { id: "m_withholding", label: "源泉所得税・社会保険料の納付確認（毎月10日／特例は7月・1月）", note: "税務カレンダーでリマインド" },
  { id: "m_close", label: "月次を締める（ロック）", note: "締め後の修正は履歴が残るようにする" },
];

/* ───────── AIプロンプト ───────── */
export interface AiPrompt {
  id: string;
  title: string;
  when: string;
  build: (ctx: { company: string; industry: string; period: string; month: string; termNo: number }) => string;
}

const COMMON = `# 前提
- あなたは日本の中小企業・スタートアップ向けの会計アシスタントです。
- 税務・会計の最終判断は人間（代表者または税理士）が行います。不確実な点は「要確認」と明記してください。
- 根拠となる法令・通達・制度名があれば併記してください。`;

export const AI_PROMPTS: AiPrompt[] = [
  {
    id: "journal", title: "仕訳チェック（月次）", when: "毎月：明細取込後",
    build: (c) => `${COMMON}

# 依頼
${c.company}（${c.industry || "業種未設定"}）の${c.month}分の仕訳をレビューしてください。
1. 勘定科目が不適切な可能性のある仕訳を指摘し、推奨科目と理由を示す
2. 重複・金額の異常・摘要不備を検出する
3. 不明な取引について、確認すべき質問を箇条書きにする
4. 消費税区分・インボイス（適格請求書）の要確認点を挙げる

# 出力形式
表（行番号 / 日付 / 摘要 / 現在の科目 / 推奨科目 / 理由 / 重要度）

# データ（個人情報・口座番号はマスクして貼り付け）
（ここに仕訳帳CSVを貼り付け）`,
  },
  {
    id: "monthly", title: "月次レビュー", when: "毎月：試算表の確認時",
    build: (c) => `${COMMON}

# 依頼
${c.company}の${c.month}の月次試算表をレビューしてください。
1. 前月比・前年同月比で大きく変動した科目と、考えられる要因
2. 売上総利益率・販管費率・営業利益率の推移コメント
3. 来月以降のリスクと、今月中に確認すべきこと（3つまで）
4. 経営者向けの3行サマリー

# データ
（試算表と前月・前年同月の数値を貼り付け）`,
  },
  {
    id: "cash", title: "資金繰り・納税資金", when: "毎月：残高確認時",
    build: (c) => `${COMMON}

# 依頼
${c.company}の資金繰りを確認し、${c.period}の決算・納税に向けた資金計画を作ってください。
- 現預金残高、月次の入出金見込み、借入返済、納税見込額（法人税・事業税・住民税・消費税）を踏まえる
- 今のバーンレートでの残り月数（ランウェイ）を計算
- 納税時期に資金が不足する場合の対策案（優先順位付き）

# データ
現預金残高：
月次入金見込み：
月次出金見込み：
納税見込額：
借入返済予定：`,
  },
  {
    id: "adjust", title: "決算整理チェック", when: "決算月：決算整理の前",
    build: (c) => `${COMMON}

# 依頼
${c.company}の第${c.termNo}期（${c.period}）の決算整理で漏れがないかチェックリスト化してください。
1. 減価償却（固定資産台帳と少額特例の適用可否）
2. 未払費用・前払費用・未収収益・未払金の計上漏れ
3. 役員報酬（定期同額給与）、源泉所得税、社会保険料
4. 補助金・助成金の収益計上と圧縮記帳
5. 棚卸資産・貸倒れ・仮払金仮受金・役員貸付金借入金の整理
6. 消費税の課税区分、インボイス、簡易課税の要否

# データ
（残高試算表を貼り付け）`,
  },
  {
    id: "investor", title: "決算書の投資家目線レビュー", when: "決算確定後",
    build: (c) => `${COMMON}

# 依頼
${c.company}の第${c.termNo}期決算書を、VC・金融機関のデューデリジェンス担当の視点でレビューしてください。
- 指摘されそうな論点（役員貸借、未払金、売上計上基準、研究開発費の処理など）
- 追加で説明資料が必要な項目
- KPI（ランウェイ、粗利率、売上成長率）の見せ方の改善案

# データ
（B/S・P/Lを貼り付け）`,
  },
  {
    id: "taxqa", title: "税理士へのスポット相談を作る", when: "判断に迷ったとき",
    build: (c) => `${COMMON}

# 依頼
以下の論点について、税理士へ1時間のスポット相談で確認するための質問票を作ってください。
- 事実関係（日付・金額・契約内容）の整理
- 論点ごとの「自社の仮説」と「確認したい点」
- 事前に用意すべき資料リスト

会社：${c.company}（${c.industry || "業種未設定"}） 対象期：第${c.termNo}期（${c.period}）
論点：
（ここに迷っている処理を書く）`,
  },
];

/* ───────── 内製化判定 ───────── */
export interface InhouseQuestion {
  id: string;
  label: string;
  weight: number; // 高いほど専門家の関与が望ましい
  hint: string;
}

export const INHOUSE_QUESTIONS: InhouseQuestion[] = [
  { id: "q_vc", label: "VC・事業会社からの出資を受けている／受ける予定", weight: 3, hint: "投資契約・株主向け報告・DDで会計の精度が問われます" },
  { id: "q_overseas", label: "海外取引・外貨建取引・海外子会社がある", weight: 3, hint: "移転価格・源泉・為替の論点が増えます" },
  { id: "q_asset", label: "高額な固定資産・リース・ソフトウェア資産がある", weight: 2, hint: "減価償却・資産計上の判断が必要" },
  { id: "q_subsidy", label: "補助金・助成金を受けている（または予定）", weight: 2, hint: "圧縮記帳・収益計上時期に注意" },
  { id: "q_so", label: "ストックオプション・種類株式を発行している", weight: 3, hint: "税制適格・資本政策の専門判断が必要" },
  { id: "q_employees", label: "従業員が10人以上いる", weight: 1, hint: "社労士連携は必要だが会計自体は内製可能" },
  { id: "q_inventory", label: "在庫・原価計算がある", weight: 2, hint: "棚卸・原価計算の精度が利益に直結" },
  { id: "q_related", label: "役員・関連会社との取引（貸借・売買）が多い", weight: 2, hint: "税務リスクが高い領域" },
];

export const FREE_SYSTEMS = [
  { name: "e-Tax", desc: "国税（法人税・地方法人税・消費税）の電子申告・納税。利用無料", url: "https://www.e-tax.nta.go.jp/" },
  { name: "eLTAX", desc: "地方税（事業税・県民税・市民税）の電子申告。利用無料。複数自治体へ一括申告可", url: "https://www.eltax.lta.go.jp/" },
  { name: "国税庁 法人税の情報", desc: "申告書の様式・別表の記載方法・申告期限延長の手続き", url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/hojin.htm" },
  { name: "マイナンバーカード", desc: "e-Taxの電子証明書として利用可能", url: "https://myna.go.jp/" },
  { name: "商業登記電子証明書（法務省）", desc: "マイナンバーカード方式を使わない場合の電子証明書（有料）", url: "https://www.moj.go.jp/MINJI/minji06_00040.html" },
  { name: "登記・供託オンライン申請", desc: "役員変更・本店移転などのオンライン申請", url: "https://www.touki-kyoutaku-online.moj.go.jp/" },
  { name: "官報", desc: "決算公告を官報で行う場合の掲載申込み", url: "https://www.kanpo.go.jp/" },
  { name: "国税庁 インボイス公表サイト", desc: "登録番号の確認・取引先の登録状況の確認", url: "https://www.invoice-kohyo.nta.go.jp/" },
];

export const SOFTWARE = [
  { name: "freee会計 ＋ freee申告", price: "会計 月2,380円〜 / 申告 年29,800円〜（税別）", note: "決算サポートアプリが無料。取引の自動登録・OCR対応" },
  { name: "マネーフォワード クラウド", price: "月2,980円〜", note: "自動仕訳・AI-OCR対応。税理士の利用率が高い" },
  { name: "弥生会計オンライン", price: "月2,200円〜", note: "記帳サポートが手厚い" },
];
