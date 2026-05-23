import { useState } from "react";
import {
  FileText, Download, AlertTriangle, CheckCircle2, Info,
  Scale, Briefcase, DollarSign, Users, Copyright, Search,
  Copy, Check, ChevronRight, X,
} from "lucide-react";

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  keyClauses: string[];
  importance: "必須" | "推奨" | "任意";
  tip?: string;
  fullContent: string;
}

interface Category {
  id: string;
  title: string;
  icon: typeof FileText;
  templates: ContractTemplate[];
}

const categories: Category[] = [
  {
    id: "basic", title: "基本契約", icon: FileText,
    templates: [
      {
        id: "nda", name: "秘密保持契約書（NDA）", importance: "必須",
        description: "機密情報の開示・利用に関する取り決め。取引先・パートナーとの交渉前に締結。",
        keyClauses: ["機密情報の定義", "開示範囲・目的の制限", "第三者提供禁止", "返却・廃棄義務", "有効期間・残存条項"],
        tip: "弁護士レビュー推奨。相互開示型と一方的開示型を使い分ける。",
        fullContent: `【秘密保持契約書（NDA）テンプレート概要】

■ 目的
本契約は、◯◯株式会社（以下「甲」）と◯◯株式会社（以下「乙」）が、相互に開示する秘密情報の取扱いについて定めることを目的とします。

■ 主要条項
第1条（秘密情報の定義）
「秘密情報」とは、書面・口頭・電磁的記録を問わず、開示当事者が「秘密」または「Confidential」と明示した情報をいいます。

第2条（秘密保持義務）
受領者は、秘密情報を善良な管理者の注意をもって管理し、開示目的以外に使用してはなりません。

第3条（第三者提供の禁止）
受領者は、事前書面承認なく第三者に秘密情報を提供してはなりません。

第4条（返却・廃棄）
契約終了または要求があった場合、速やかに秘密情報を返却・廃棄します。

第5条（有効期間）
本契約の有効期間は締結日から2年間とし、秘密保持義務は契約終了後も3年間存続します。

■ チェックポイント
・双方向か一方向か確認
・除外事項（公知情報等）の定義
・損害賠償条項の有無
・準拠法・管轄裁判所の確認`,
      },
      {
        id: "outsource", name: "業務委託契約書", importance: "必須",
        description: "成果物の納品を前提とした請負型の委託契約。開発・デザイン等に活用。",
        keyClauses: ["業務内容・範囲の詳細", "納期・成果物の定義", "報酬・支払条件", "知的財産権の帰属", "瑕疵担保責任"],
        tip: "弁護士レビュー推奨。IP帰属を明確に定めること。",
        fullContent: `【業務委託契約書テンプレート概要】

■ 目的
業務の委託・受託関係を明確化し、成果物の品質・納期・IP帰属等を定めます。

■ 主要条項
第1条（業務内容）
委託者は受託者に対して以下の業務を委託します。
（業務内容を具体的に記載。別紙仕様書参照も可）

第2条（納期・成果物）
受託者は◯◯年◯◯月◯◯日までに、別紙記載の成果物を委託者に納品します。

第3条（報酬と支払条件）
委託料は◯◯円（税抜）とし、成果物検収後30日以内に支払います。

第4条（知的財産権）
本業務に関して生じた著作権等の知的財産権は、委託者に帰属します。
受託者は著作者人格権を行使しないものとします。

第5条（瑕疵担保）
納品後◯ヶ月以内に発見された不具合については、受託者が無償で修補します。

■ チェックポイント
・IP帰属（会社側に帰属させる）
・検収プロセスの明確化
・再委託の可否
・競業禁止の有無`,
      },
      {
        id: "quasi", name: "準委任契約書", importance: "推奨",
        description: "成果物よりプロセス重視の委託契約。コンサル・アドバイザー向け。",
        keyClauses: ["業務内容・善管注意義務", "報酬・支払条件", "秘密保持", "契約解除条件"],
        fullContent: `【準委任契約書テンプレート概要】

■ 目的
成果物ではなく、業務遂行プロセスへの対価を定める準委任型の契約書です。

■ 主要条項
第1条（業務内容）
受任者は委任者の指示に従い、善良な管理者の注意をもって以下の業務を処理します。

第2条（報酬）
月額◯◯円（税抜）を毎月末日締め翌月◯◯日支払いとします。

第3条（秘密保持）
業務上知り得た情報は第三者に開示してはなりません。

第4条（契約解除）
各当事者は30日前の書面通知により解除できます。

■ コンサル・アドバイザー活用時のポイント
・成果責任を負わない旨を明確化
・役務提供の時間・方法を具体化
・競業避止義務の有無を確認`,
      },
    ],
  },
  {
    id: "service", title: "サービス関連", icon: Scale,
    templates: [
      {
        id: "terms", name: "利用規約", importance: "必須",
        description: "サービス利用に関する利用者との契約条件。公開前に必ず整備。",
        keyClauses: ["サービス内容・変更権", "禁止事項", "免責事項", "解約・退会手続き", "準拠法・管轄裁判所"],
        tip: "弁護士レビュー推奨。消費者契約法・特定商取引法との整合も確認。",
        fullContent: `【利用規約テンプレート概要】

■ 構成
第1条 適用範囲
第2条 アカウント登録と管理責任
第3条 利用料金・支払い方法
第4条 禁止事項（不正利用・誹謗中傷・著作権侵害等）
第5条 知的財産権（サービスの著作権等は当社に帰属）
第6条 免責事項（当社は間接損害に責任を負わない等）
第7条 サービスの変更・終了
第8条 個人情報の取扱い（プライバシーポリシー参照）
第9条 解約・退会手続き
第10条 準拠法・管轄裁判所（東京地裁等）

■ 重要ポイント
・特定商取引法に基づく表記と連携
・BtoC向けは消費者契約法に注意
・定期的な更新と更新通知方法を定める`,
      },
      {
        id: "privacy", name: "プライバシーポリシー", importance: "必須",
        description: "個人情報の取り扱い方針。個人情報保護法に基づく開示義務。",
        keyClauses: ["収集する個人情報の種類", "利用目的", "第三者提供の条件", "Cookie・トラッキング", "問い合わせ窓口"],
        tip: "個人情報保護委員会のガイドラインに準拠。2022年改正個人情報保護法に対応。",
        fullContent: `【プライバシーポリシーテンプレート概要】

■ 必須記載事項（個人情報保護法）
1. 事業者の名称・所在地・代表者名
2. 個人情報保護管理者の氏名・連絡先
3. 利用目的の特定・明示
4. 第三者提供する場合の事項
5. 開示・訂正・削除の手続き
6. 問い合わせ窓口

■ 2022年改正対応ポイント
・保有個人データの利用停止請求権の拡大
・漏洩等の個人情報委員会への報告義務（72時間以内）
・外国への第三者提供の開示義務強化
・Cookie等の「個人関連情報」への対応

■ 医療情報を扱う場合
・要配慮個人情報として厚生労働省ガイドラインに準拠
・本人同意の取得方法を明確化`,
      },
      {
        id: "sla", name: "SLA（サービスレベル契約）", importance: "推奨",
        description: "サービスレベル保証。BtoB向けサービスで競争力に直結。",
        keyClauses: ["稼働率保証（99.9%等）", "障害対応時間・優先度", "ペナルティ・クレジット", "免責事由（計画停止等）"],
        fullContent: `【SLAテンプレート概要】

■ 主要指標
・サービス稼働率: 月間99.9%以上（計画メンテ除く）
・障害対応: Critical（1時間以内）・High（4時間以内）・Medium（24時間以内）
・データバックアップ: 毎日、保持期間30日

■ ペナルティ条項例
・稼働率99.0〜99.9%未満: 月額の5%クレジット
・稼働率99.0%未満: 月額の10%クレジット
・障害対応SLA違反: 案件毎に協議

■ 免責事由
・不可抗力（自然災害・インフラ障害等）
・ユーザー起因の問題
・計画メンテナンス（事前通知あり）`,
      },
    ],
  },
  {
    id: "investment", title: "投資関連", icon: DollarSign,
    templates: [
      {
        id: "investment", name: "投資契約書", importance: "必須",
        description: "株式発行・資金調達時の投資家との契約。必ず弁護士と締結。",
        keyClauses: ["投資金額・株数・バリュエーション", "反希薄化条項（ラチェット等）", "情報開示義務", "優先清算権", "コベナンツ（誓約事項）"],
        tip: "弁護士レビュー必須。投資家側の弁護士レビューも確認する。",
        fullContent: `【投資契約書の主要条項概要】

■ 基本条件
・投資金額: ◯◯円
・発行株式: 優先株式（A種/B種等）
・バリュエーション（Post-money）: ◯◯億円

■ 主要条項
1. 優先配当権: 優先株配当を普通株より先に受ける権利
2. 優先清算権（残余財産）: 普通株より先に投資元本を回収
3. 転換権: 優先株を普通株に転換できる権利
4. 反希薄化条項: 追加調達時の株価下落保護
5. 議決権: 普通株と同等、または一部事項に拒否権
6. 情報開示: 月次・四半期の財務情報提供義務
7. 事前承認事項: 大型支出・事業変更等の投資家承認

■ 交渉ポイント
・優先清算権を参加型か非参加型か
・みなし清算（M&A時の扱い）
・ドラッグアロング（強制売却権）の条件`,
      },
      {
        id: "sha", name: "株主間契約書（SHA）", importance: "必須",
        description: "株主間の権利義務を定める契約。VC投資時に締結が標準的。",
        keyClauses: ["優先株の権利詳細", "取締役選任権", "先買権・売却随伴義務", "競業避止・専念義務", "情報権"],
        tip: "弁護士レビュー必須。定款と整合性を確認。",
        fullContent: `【株主間契約書（SHA）の主要条項概要】

■ 目的
株主間の権利義務を定め、将来の紛争を予防します。

■ 主要条項
1. 取締役選任権: 投資家が1名以上の取締役選任を保証
2. 先買権（Right of First Refusal）: 株式売却時に既存株主が優先購入できる権利
3. 共同売却権（Tag-Along）: 創業者売却時に同条件で参加できる権利
4. 強制売却権（Drag-Along）: M&A時に全株主の参加を強制できる権利
5. 情報権: 月次・四半期・年次の財務情報提供
6. 競業避止: 創業者の競業禁止期間・範囲
7. 専念義務: 创业者が他の事業を兼業しない義務

■ 解除条件と上場
・IPO時にSHAの多くの条項が失効
・M&A時の扱いを明確に定める`,
      },
      {
        id: "stock-option", name: "新株予約権発行要項", importance: "推奨",
        description: "ストックオプションの発行条件を定める。優秀人材採用に不可欠。",
        keyClauses: ["付与対象・付与数", "行使価格の決定方法", "権利行使期間", "ベスティングスケジュール", "退職時・M&A時の取扱"],
        tip: "税制適格SOは税務要件の遵守が必要。税理士・弁護士に確認を。",
        fullContent: `【新株予約権発行要項の概要】

■ 一般的な設計
・付与対象: 取締役・従業員・社外協力者
・行使価格: 直近株価（税制適格は公正価値以上）
・権利行使期間: 付与から2年後〜10年以内

■ ベスティングスケジュール（標準）
・4年ベスティング / 1年クリフ
・1年経過後に25%権利確定
・その後月1/48ずつ確定（36ヶ月）

■ 税制適格ストックオプション要件
・年間行使額1,200万円まで
・行使価格は付与時の株価以上
・付与から2年後〜10年以内に行使
・上場株式等への変更等の要件あり

■ 退職時の取扱
・権利確定分: 退職後6ヶ月〜1年以内に行使可能
・未確定分: 失効
・解雇の場合は個別協議`,
      },
    ],
  },
  {
    id: "employment", title: "雇用関連", icon: Briefcase,
    templates: [
      {
        id: "employment", name: "雇用契約書", importance: "必須",
        description: "労働条件を明示する法定の契約書。採用時に必ず締結。",
        keyClauses: ["勤務地・業務内容", "労働時間・休日・休暇", "賃金・支払日・残業代", "試用期間", "退職時の予告"],
        tip: "労働基準法に基づく書面交付義務あり（2024年〜電子交付も可）。",
        fullContent: `【雇用契約書の必須記載事項（労働基準法）】

■ 絶対的明示事項（必ず書面で）
1. 労働契約の期間（期間の定め有無）
2. 就業場所・従事する業務内容
3. 始業・終業時刻、時間外労働の有無
4. 休憩時間、休日、休暇
5. 賃金（計算・支払方法、締切・支払日、昇給）
6. 退職（解雇の事由含む）

■ 相対的明示事項（定めがある場合）
・退職手当・賞与
・食費・作業用品等の負担
・安全衛生・職業訓練・災害補償

■ 試用期間
・最長3〜6ヶ月が一般的
・試用期間中も労働基準法適用
・本採用拒否は解雇と同様の要件

■ 2024年法改正のポイント
・無期転換ルールの説明義務
・定年後再雇用等の更新上限の明示義務`,
      },
      {
        id: "nda-employee", name: "秘密保持誓約書（入社時）", importance: "必須",
        description: "従業員による機密保持の誓約。在職中・退職後も効力あり。",
        keyClauses: ["機密情報の定義", "保持義務の範囲", "退職後も継続する旨", "違反時の損害賠償"],
        fullContent: `【秘密保持誓約書の主要内容】

■ 誓約事項
1. 業務上知り得た一切の機密情報を第三者に漏洩しない
2. 機密情報を業務目的以外に使用しない
3. 退職後◯年間も同様の義務を負う
4. 在職中・退職時に機密情報を持ち出さない

■ 機密情報の定義（例）
・技術情報（ソースコード・設計書等）
・顧客リスト・商談情報
・価格・財務情報
・事業計画・戦略

■ 退職時の確認事項
・情報媒体・機器の返却確認
・クラウドサービスのアクセス権限削除
・秘密保持義務の継続確認`,
      },
      {
        id: "non-compete", name: "競業避止義務同意書", importance: "推奨",
        description: "退職後の競業・誘引を制限する同意書。過度な制限は無効になることも。",
        keyClauses: ["競業禁止期間（1年以内が目安）", "対象業種・地域の明確化", "補償の有無", "違反時の措置"],
        tip: "補償なしの長期義務は無効になりやすい。弁護士確認を推奨。",
        fullContent: `【競業避止義務同意書のポイント】

■ 有効性判断の基準（裁判例）
1. 企業の正当な利益があるか
2. 在職中の地位・機密へのアクセス程度
3. 地域的限定があるか
4. 競業禁止期間が合理的か（1年程度が限度）
5. 代償（補償金）が支払われているか

■ 一般的な設計
・期間: 退職後1年以内（長くても2年）
・範囲: 競合他社への転職・同種事業の開始
・地域: 国内に限定
・補償: 月額◯万円（在職中の代償措置も可）

■ 誘引禁止（ノンソリシテーション）
・従業員の引き抜き禁止
・顧客・取引先への勧誘禁止
競業避止より有効性が認められやすい`,
      },
    ],
  },
  {
    id: "ip", title: "知財関連", icon: Copyright,
    templates: [
      {
        id: "copyright", name: "著作権譲渡契約書", importance: "必須",
        description: "従業員・外注先の成果物の著作権を会社に譲渡させる契約。",
        keyClauses: ["譲渡対象の著作物の特定", "譲渡対価", "著作者人格権の不行使特約", "第三者権利不存在の保証"],
        tip: "著作権は自動的に会社に帰属しない。明示的な契約が必要。",
        fullContent: `【著作権譲渡契約書の主要内容】

■ 主要条項
第1条（譲渡対象）
受託者が本業務の遂行に際して作成した著作物（コード・デザイン・文書等）の著作権一切を委託者に譲渡します。

第2条（著作者人格権の不行使）
受託者は、著作者人格権（公表権・氏名表示権・同一性保持権）を行使しないものとします。

第3条（第三者の権利の不存在）
受託者は、本著作物が第三者の知的財産権を侵害していないことを保証します。

■ 注意点
・「職務著作」（従業員が職務で作成）は会社に帰属
・フリーランス・外注先は別途契約が必要
・オープンソースライセンスとの関係を確認
・AIが生成したコンテンツの著作権は未整備

■ OSSライセンスチェック
使用するOSSのライセンス（MIT・Apache・GPL等）を確認し、商用利用・改変・再頒布の条件を遵守する。`,
      },
      {
        id: "license", name: "ライセンス契約書", importance: "推奨",
        description: "知的財産の利用許諾に関する契約。技術供与・ブランドライセンス等。",
        keyClauses: ["ライセンス対象の特定", "独占/非独占の別", "利用可能な地域・期間", "ライセンスフィー", "再ライセンスの可否"],
        fullContent: `【ライセンス契約書の主要内容】

■ ライセンスの種類
・独占的ライセンス: 特定事業者のみ利用可能（収益重視）
・非独占的ライセンス: 複数事業者が利用可能（普及重視）
・独占的サブライセンス: 再配布権も付与

■ 主要条項
1. ライセンス対象（特許番号・商標登録番号・著作物等）
2. 許諾の範囲（用途・地域・期間）
3. ライセンスフィー（一括払い・ランニングロイヤリティ）
4. 品質管理・監査権
5. 契約解除条件（不払い・権利侵害等）

■ ライセンス料の設定目安
・ランニングロイヤリティ: 売上の1〜10%
・イニシャルフィー: 業界慣行に準拠
・ミニマムギャランティ: 最低保証金額を設定`,
      },
    ],
  },
];

const importanceColors = {
  必須: "bg-red-50 text-red-700 border-red-200",
  推奨: "bg-amber-50 text-amber-700 border-amber-200",
  任意: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function ContractsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"すべて" | "必須" | "推奨">("すべて");

  const handleCopy = () => {
    if (!selectedTemplate) return;
    navigator.clipboard.writeText(selectedTemplate.fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCategories = categories.map(cat => ({
    ...cat,
    templates: cat.templates.filter(t => {
      if (filter !== "すべて" && t.importance !== filter) return false;
      if (search && !t.name.includes(search) && !t.description.includes(search)) return false;
      return true;
    }),
  })).filter(cat => cat.templates.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">契約書テンプレート</h1>
        <p className="mt-1 text-slate-500">スタートアップに必要な契約書の種類と主要条項を確認できます。</p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">重要:</span> 契約書は法的効力を持つため、テンプレートをそのまま使用せず、必ず弁護士のレビューを受けてください。
          </p>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="契約書名・キーワードで検索..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(["すべて", "必須", "推奨"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${filter === f ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* テンプレートリスト */}
        <div className="lg:col-span-2 space-y-5">
          {filteredCategories.map(category => {
            const Icon = category.icon;
            return (
              <div key={category.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{category.title}</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {category.templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${selectedTemplate?.id === template.id ? "bg-primary-50" : ""}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{template.name}</span>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${importanceColors[template.importance]}`}>
                            {template.importance}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{template.description}</p>
                      </div>
                      <ChevronRight className={`mt-0.5 h-5 w-5 shrink-0 ${selectedTemplate?.id === template.id ? "text-primary-500" : "text-slate-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 詳細パネル */}
        <div className="lg:sticky lg:top-24">
          {selectedTemplate ? (
            <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">{selectedTemplate.name}</h3>
                <button onClick={() => setSelectedTemplate(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${importanceColors[selectedTemplate.importance]}`}>
                {selectedTemplate.importance}
              </span>

              <p className="text-sm leading-relaxed text-slate-600">{selectedTemplate.description}</p>

              {/* チェックポイント */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 確認すべき主要条項
                </p>
                <ul className="space-y-1">
                  {selectedTemplate.keyClauses.map(c => (
                    <li key={c} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedTemplate.tip && (
                <div className="flex items-start gap-2 rounded-xl bg-primary-50 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                  <p className="text-xs text-primary-800">{selectedTemplate.tip}</p>
                </div>
              )}

              {/* コンテンツプレビュー */}
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">概要テキスト（参考）</p>
                <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-3">
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{selectedTemplate.fullContent}</pre>
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "コピーしました" : "テキストをコピー"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-12 px-6 text-center">
              <FileText className="mb-3 h-12 w-12 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">契約書を選択してください</p>
              <p className="mt-1 text-xs text-slate-400">左のリストから契約書を選ぶと詳細を確認できます</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
