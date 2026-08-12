import type { TargetAudience } from '../types';
import type { TemplateCategory, TemplateScope, TemplateStepDef } from './templateTypes';

export interface TemplateCatalogEntry {
  id: string;
  title: string;
  category: TemplateCategory;
  scope?: TemplateScope;
  targetAudience: TargetAudience[];
  description: string;
  tags: string[];
  imageHint: string;
  steps: TemplateStepDef[];
}

export const TEMPLATE_CATALOG: TemplateCatalogEntry[] = [
  {
    id: 'clinic-reception',
    title: '新患受付の手順',
    category: 'clinic',
    targetAudience: ['new_staff'],
    description: '受付での新患対応の基本フロー（保険証確認〜待合案内まで）',
    tags: ['受付', '新患'],
    imageHint: '付属の画面イメージを、実際の受付・レセコン画面のスクショに差し替えると完成です',
    steps: [
      {
        type: 'normal',
        title: 'ご来院・保険証のお預かり',
        instruction:
          '来院された方に挨拶し、保険証（または資格確認書）をお預かりします。紹介状・各種受給者証がある場合は一緒に確認します。\n' +
          '氏名・生年月日・記号番号が受付票と一致しているか、その場で目視確認してください。\n' +
          '有効期限切れや記載不明がある場合は、先に進まず受付責任者へ確認します。',
        note: '保険証の画像をマニュアルに載せる場合は、記号番号・住所を必ずマスキングしてください。',
        clickX: 38,
        clickY: 45,
      },
      {
        type: 'normal',
        title: '問診票のお渡しと基本情報の確認',
        instruction:
          '問診票（紙またはタブレット）をお渡しし、記入方法を簡潔に説明します。\n' +
          'アレルギー・既往歴・お薬の有無は必ず記載してもらいます。\n' +
          '記入が終わったら、連絡先・緊急連絡先が読み取れるか受付で確認します。',
        clickX: 55,
        clickY: 40,
      },
      {
        type: 'normal',
        title: '患者情報の登録（レセコン・電子カルテ）',
        instruction:
          'レセコン／電子カルテの「新患登録」画面を開き、保険証情報どおりに基本情報を入力します。\n' +
          '住所・電話番号は発音確認し、誤入力を防ぎます。\n' +
          '登録完了後、患者ID（カルテ番号）が発行されたことを画面で確認します。',
        clickX: 45,
        clickY: 52,
      },
      {
        type: 'check',
        title: '待合へのご案内・次回予約の確認',
        instruction:
          '「○番の待合でお待ちください」と声かけし、トイレ・飲み物・雑誌の場所を案内します。\n' +
          '初診の方には診察までのおおよその流れ（問診→診察→会計）を一言添えます。\n' +
          '次回予約の希望がある場合は、会計後に予約を取る旨を伝えて受付を完了します。',
        clickX: 50,
        clickY: 55,
      },
    ],
  },
  {
    id: 'clinic-accounting',
    title: '会計・レセプト入力',
    category: 'clinic',
    targetAudience: ['new_staff', 'admin'],
    description: '診察後の会計処理とレセプト確認',
    tags: ['会計', 'レセコン'],
    imageHint: '会計画面・領収書サンプルの写真に差し替えてください',
    steps: [
      {
        type: 'normal',
        title: '診療内容と会計画面の照合',
        instruction:
          '電子カルテの診療記録と、会計システムに表示されている診療内容・点数が一致しているか確認します。\n' +
          '同日に複数科を受診している場合は、科ごとに明細を確認します。\n' +
          '不明点がある場合は診療科または会計担当へ確認してから会計を進めます。',
        clickX: 40,
        clickY: 48,
      },
      {
        type: 'warning',
        title: '自己負担額・特例措置の確認',
        instruction:
          '高額療養費・限度額認定証、生活保護・障害者医療など特例がある場合は、システム上の負担区分を確認します。\n' +
          '自己負担額を口頭で伝える前に、画面表示と領収書案の金額が一致しているか必ず見比べます。\n' +
          '患者から疑問が出た場合は、その場で計算根拠を説明できるよう準備しておきます。',
        note: '金額の誤りはクレームにつながりやすい最重要ポイントです。',
        clickX: 48,
        clickY: 50,
      },
      {
        type: 'normal',
        title: '会計・領収書の発行',
        instruction:
          '現金・カード・電子マネーなど、院内で定められた方法で会計を完了します。\n' +
          '領収書と診療明細書を渡し、日付・金額・宛名に誤りがないか患者と一緒に確認します。\n' +
          '領収書の控えが必要な方には、再発行手順を案内します。',
        clickX: 52,
        clickY: 46,
      },
      {
        type: 'check',
        title: '次回予約・お見送り',
        instruction:
          '次回の予約日時を確認し、予約票またはメモをお渡しします。\n' +
          'お薬がある場合は、会計後に薬局での受け取り方法を案内します。\n' +
          '「本日はお大事に」とお見送りし、会計業務を完了します。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'clinic-consent',
    title: 'インフォームドコンセント説明',
    category: 'clinic',
    targetAudience: ['patient'],
    description: '処置・検査前の説明と同意取得の流れ',
    tags: ['同意書', '患者説明'],
    imageHint: '同意書フォーマットや説明用資料の写真を挿入してください',
    steps: [
      {
        type: 'normal',
        title: '検査・処置の目的を説明',
        instruction:
          'これから行う検査・処置が「何のために必要か」を、専門用語を避けて説明します。\n' +
          '「何がわかるか」「治療方針にどう役立つか」を具体例を交えて伝えます。\n' +
          '患者が納得できるまで質問を促し、わからない点は繰り返し説明します。',
        clickX: 42,
        clickY: 44,
      },
      {
        type: 'warning',
        title: 'リスク・副作用・代替案の説明',
        instruction:
          '起こりうるリスクや副作用、発生した場合の対応について正直に説明します。\n' +
          '代替となる検査・治療法がある場合は、メリット・デメリットを比較して伝えます。\n' +
          '説明後、「ご不明な点はありますか」と必ず確認します。',
        note: '説明内容は同意書の記載と矛盾しないよう、院内フォーマットに沿ってください。',
        clickX: 50,
        clickY: 48,
      },
      {
        type: 'check',
        title: '同意書への署名・記録',
        instruction:
          '理解いただけた場合、同意書に署名・日付を記入いただきます。\n' +
          '説明した医師名・日時を記録し、同意書は原本を保管します。\n' +
          'コピーが必要な場合は、院内規定に従って交付します。',
        clickX: 46,
        clickY: 52,
      },
    ],
  },
  {
    id: 'clinic-hygiene',
    title: '院内感染対策チェック',
    category: 'clinic',
    targetAudience: ['new_staff'],
    description: '手洗い・消毒・廃棄物の基本手順',
    tags: ['感染対策'],
    imageHint: '消毒薬の配置・正しい手洗い手順の写真を各手順に',
    steps: [
      {
        type: 'normal',
        title: '手指衛生（診療前後）',
        instruction:
          '診療前・診療後、および汚染が疑われる操作の前後に手指消毒を行います。\n' +
          '手指消毒は手のひら・指の間・親指・手首まで漏れなく行います。\n' +
          '消毒後は清潔な手袋を装着し、不要な接触を避けます。',
        clickX: 40,
        clickY: 50,
      },
      {
        type: 'normal',
        title: '診療台・器具の清拭消毒',
        instruction:
          '患者ごとに診療台・操作パネル・よく触る箇所を清拭し、指定の消毒薬で消毒します。\n' +
          '使用した器具は所定の手順で洗浄・消毒・滅菌のいずれかに回します。\n' +
          '清拭範囲は院内マニュアルに記載されたチェックリストに沿って確認します。',
        clickX: 48,
        clickY: 45,
      },
      {
        type: 'check',
        title: '廃棄物の分別と処理',
        instruction:
          '感染性廃棄物・一般廃棄物・資源ごとに分別し、指定の容器に廃棄します。\n' +
          '針・刃物は専用の耐刺穿容器に廃棄し、蓋をしっかり閉めます。\n' +
          '廃棄記録が必要な場合は、日付・種類・量を記入します。',
        note: '廃棄物の取り違えは感染リスクにつながるため、ラベルを必ず確認してください。',
        clickX: 52,
        clickY: 55,
      },
    ],
  },
  {
    id: 'edu-print',
    title: '授業プリント（解説＋確認問題）',
    category: 'education',
    targetAudience: ['new_staff'],
    description: '1コマ用ワークシートの完成イメージ',
    tags: ['プリント', 'ワークシート'],
    imageHint: '板書・教材の写真に差し替えると授業でそのまま使えます',
    steps: [
      {
        type: 'normal',
        title: '学習目標の提示',
        instruction:
          '本時の学習目標を冒頭に大きく記載します（例：「〇〇の仕組みを説明できる」）。\n' +
          '目標は生徒が読んで「今日何をするか」がわかる一文にします。\n' +
          '単元名・教科名は {{講座名}} / {{単元名}} を実際の名称に置き換えてください。',
        clickX: 42,
        clickY: 38,
      },
      {
        type: 'normal',
        title: '解説パート（図解）',
        instruction:
          '概念を図や表で整理し、キーワードは太字で強調します。\n' +
          '1ページに情報を詰め込みすぎず、左から右・上から下の順で読める構成にします。\n' +
          '板書やスライドのキャプチャを挿入すると、授業とプリントの対応がわかりやすくなります。',
        clickX: 50,
        clickY: 48,
      },
      {
        type: 'normal',
        title: '例題（思考の過程を見せる）',
        instruction:
          '典型例を1題、途中式・考え方のメモ付きで示します。\n' +
          '「なぜこの式になるか」を短い言葉で添え、生徒が真似できる形にします。\n' +
          '難易度は本時の目標に合わせ、応用は次のステップに回します。',
        clickX: 45,
        clickY: 52,
      },
      {
        type: 'check',
        title: '確認問題（3問程度）',
        instruction:
          '基礎1問・応用1問・言語化1問など、バランスよく3問程度を配置します。\n' +
          '答えは別ページまたは教員用メモに記載し、授業の最後5分で振り返りに使います。\n' +
          '配点や提出期限がある場合は欄を設けて明記します。',
        clickX: 48,
        clickY: 55,
      },
    ],
  },
  {
    id: 'edu-test',
    title: '小テスト・答案用紙',
    category: 'education',
    targetAudience: ['new_staff'],
    description: '定期試験・小テストのレイアウトひな形',
    tags: ['テスト', '答案'],
    imageHint: '出題例・配点表のイメージを実際の資料に差し替え',
    steps: [
      {
        type: 'normal',
        title: '試験情報ヘッダー',
        instruction:
          '教科名・実施日・氏名欄・組・番号・制限時間・満点を上部に記載します。\n' +
          '注意事項（カンニング禁止・解答欄の書き方）を簡潔に添えます。\n' +
          '配点は各大問の右肩に明記し、合計が満点と一致するか確認します。',
        clickX: 40,
        clickY: 35,
      },
      {
        type: 'normal',
        title: '大問1（知識・用語）',
        instruction:
          '用語説明・選択問題など、基礎知識を問う大問を配置します。\n' +
          '1問あたりの配点と想定解答時間を意識し、文量を調整します。\n' +
          '選択肢は縦並びで読みやすく、番号を統一します。',
        clickX: 48,
        clickY: 45,
      },
      {
        type: 'normal',
        title: '大問2（応用・記述）',
        instruction:
          '記述・計算・図示など、思考力を問う問題を配置します。\n' +
          '解答欄の行数を十分に取り、途中式を書くスペースを確保します。\n' +
          '図が必要な場合は枠を用意し、「図を書きなさい」と指示します。',
        clickX: 50,
        clickY: 50,
      },
      {
        type: 'check',
        title: '模範解答・採点基準（教員用）',
        instruction:
          '各大問の模範解答と部分点の目安を記載します（生徒配布用からは除外可）。\n' +
          'よくある誤答例と減点基準をメモしておくと、採点のブレが減ります。\n' +
          '難易度調整のため、次回に活かす反省欄を設けてもよいでしょう。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'edu-experiment',
    title: '理科・実験レポート',
    category: 'education',
    targetAudience: ['new_staff'],
    description: '実験手順と考察の記録フォーマット',
    tags: ['実験', 'レポート'],
    imageHint: '実験器具・結果グラフの写真を挿入',
    steps: [
      {
        type: 'normal',
        title: '目的・仮説',
        instruction:
          '実験の目的を1〜2文で書き、検証したい仮説を明確に記述します。\n' +
          '「〇〇すれば△△になると考える」の形で、変数の関係がわかるようにします。',
        clickX: 42,
        clickY: 40,
      },
      {
        type: 'normal',
        title: '器具・材料と手順',
        instruction:
          '使用する器具・薬品・材料をリストアップし、安全上の注意を併記します。\n' +
          '手順は番号付きで、温度・時間・量など測定条件を具体的に書きます。\n' +
          '実験台の配置写真があると、再現性が高まります。',
        clickX: 48,
        clickY: 48,
      },
      {
        type: 'normal',
        title: '結果の記録',
        instruction:
          '観察結果・測定値を表やグラフで整理します。単位を忘れず記載します。\n' +
          '異常値があった場合はその旨をメモし、再測定したかどうかも記録します。',
        clickX: 50,
        clickY: 52,
      },
      {
        type: 'check',
        title: '考察・課題',
        instruction:
          '結果からわかったことと、仮説が支持されたかを論理的に述べます。\n' +
          '誤差の要因・改善案・次に調べたいことを簡潔にまとめます。\n' +
          '参考文献や協力者への謝辞が必要な場合は末尾に記載します。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'edu-parent',
    title: '保護者向けお便り',
    category: 'education',
    targetAudience: ['patient'],
    description: '行事案内・持ち物・提出物のお知らせ',
    tags: ['保護者', 'お便り'],
    imageHint: '行事の写真や持ち物リストのイメージを挿入',
    steps: [
      {
        type: 'normal',
        title: 'はじめに（ご挨拶）',
        instruction:
          '保護者の皆様への挨拶と、本便りの目的（行事案内・お願い等）を記載します。\n' +
          'クラス名・担当教員名・発行日を明記し、読み手が状況を把握できるようにします。',
        clickX: 40,
        clickY: 38,
      },
      {
        type: 'normal',
        title: '日程・場所・集合時間',
        instruction:
          '行事名・日時・集合場所・解散時間・雨天時の対応を表形式でまとめます。\n' +
          '変更の可能性がある場合は、連絡手段（LINE・メール等）を併記します。',
        clickX: 48,
        clickY: 45,
      },
      {
        type: 'normal',
        title: '持ち物・服装・お願い',
        instruction:
          '持参品を箇条書きにし、忘れやすいものは太字で強調します。\n' +
          '服装・健康面でのお願い（発熱時は参加見合わせ等）を具体的に書きます。',
        clickX: 50,
        clickY: 50,
      },
      {
        type: 'check',
        title: '提出物・お問い合わせ先',
        instruction:
          '提出期限・提出方法（封筒・オンライン等）を明記します。\n' +
          '不明点の連絡先は {{snippet:contact}} または {{問い合わせ先}} を設定画面の変数で一括管理できます。\n' +
          '返信が必要な場合は、期限と返信方法をはっきり書きます。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'edu-lesson-plan',
    title: '授業計画（1コマ）',
    category: 'education',
    targetAudience: ['new_staff'],
    description: '導入・展開・まとめの授業設計シート',
    tags: ['授業計画', '指導案'],
    imageHint: '板書計画や教材キャプチャを挿入',
    steps: [
      {
        type: 'normal',
        title: '単元・目標・評価規準',
        instruction:
          '単元名・時数・本時の目標（知識・技能・態度）を記載します。\n' +
          '評価規準（何をもって達成とするか）を1〜2行で添えます。',
        clickX: 42,
        clickY: 40,
      },
      {
        type: 'normal',
        title: '導入（5〜10分）',
        instruction:
          '動機づけの問いかけ、前時までの振り返り、本時の流れの提示を書きます。\n' +
          '板書の最初に書くキーワードをメモしておきます。',
        clickX: 48,
        clickY: 46,
      },
      {
        type: 'normal',
        title: '展開（メイン活動）',
        instruction:
          '生徒の活動（個人・ペア・グループ）と教師の支援・質問を時系列で記述します。\n' +
          '使用する教材・URL・プリントのページを明記します。\n' +
          '想定されるつまずきと、そのときのフォローをメモしておくと安心です。',
        clickX: 50,
        clickY: 50,
      },
      {
        type: 'check',
        title: 'まとめ・評価・宿題',
        instruction:
          '本時の要点を生徒に言語化させる振り返り活動を記載します。\n' +
          '形成的評価（観察ポイント）と、必要なら宿題・次時の予告を書きます。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'smb-expense',
    title: '経費精算の申請',
    category: 'smb',
    targetAudience: ['customer'],
    description: '社内経費精算の申請から承認まで',
    tags: ['経費', '申請'],
    imageHint: '経費システムの画面スクショに差し替え',
    steps: [
      {
        type: 'normal',
        title: '領収書の準備と撮影',
        instruction:
          '経費に該当する領収書・レシートを用意し、日付・金額・但し書きが読める状態で撮影します。\n' +
          '電子領収書の場合はPDFを保存し、ファイル名に日付と用途を入れます。\n' +
          '私的利用と混在しないよう、用途をメモしておきます。',
        clickX: 40,
        clickY: 45,
      },
      {
        type: 'normal',
        title: '経費システムへの入力',
        instruction:
          '社内の経費精算システムにログインし、「新規申請」から入力を開始します。\n' +
          '勘定科目・補助科目・金額・支払先・プロジェクトコードを正確に選択します。\n' +
          '添付ファイルに領収書画像をアップロードし、プレビューで文字が読めるか確認します。',
        clickX: 48,
        clickY: 50,
      },
      {
        type: 'check',
        title: '申請・承認フロー',
        instruction:
          '内容を確認し、上長を承認者として申請を送信します。\n' +
          '差し戻しがあった場合はコメントを確認し、修正して再申請します。\n' +
          '承認完了後、振込予定日をシステム上で確認して完了です。',
        clickX: 50,
        clickY: 52,
      },
    ],
  },
  {
    id: 'smb-onboarding',
    title: '新入社員オンボーディング',
    category: 'smb',
    targetAudience: ['new_staff'],
    description: '初日〜1週間のセットアップチェックリスト',
    tags: ['人事', 'オンボーディング'],
    imageHint: '各ツールのログイン画面をキャプチャ',
    steps: [
      {
        type: 'normal',
        title: 'アカウント・端末の受け取り',
        instruction:
          'メールアドレス・チャット・勤怠・ファイル共有など、付与されたアカウント一覧を確認します。\n' +
          'PC・スマホの初期設定（Wi-Fi・プリンタ・セキュリティソフト）を情シス手順に沿って行います。\n' +
          'パスワードは社内ルール（長さ・定期変更）に従い、管理ツールに登録します。',
        clickX: 42,
        clickY: 44,
      },
      {
        type: 'normal',
        title: 'セキュリティ設定',
        instruction:
          '2段階認証（MFA）を必ず有効化します。VPNが必要な場合は接続テストを行います。\n' +
          '社外へのファイル持ち出しルール・機密情報の扱いを確認し、誓約書があれば提出します。',
        note: 'フィッシング研修の受講期限がある場合はカレンダーに登録してください。',
        clickX: 48,
        clickY: 48,
      },
      {
        type: 'normal',
        title: '初日の業務・顔合わせ',
        instruction:
          '直属の上司・チームメンバーと顔合わせし、連絡手段（チャットチャンネル等）を確認します。\n' +
          '業務で使うフォルダ・マニュアル・FAQへのリンクをブックマークします。',
        clickX: 50,
        clickY: 50,
      },
      {
        type: 'check',
        title: '1週間後の振り返り',
        instruction:
          'わからないこと・困っていることをリストアップし、1on1で共有します。\n' +
          '権限不足・ツール未設定がないか情シス・人事と確認し、オンボーディングを完了します。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'smb-customer-reply',
    title: 'お客様問い合わせ対応',
    category: 'smb',
    targetAudience: ['customer'],
    description: '問い合わせ受付から回答・クローズまで',
    tags: ['サポート', 'CS'],
    imageHint: 'CRM・チケット画面のスクショに差し替え',
    steps: [
      {
        type: 'normal',
        title: '受付・分類・優先度設定',
        instruction:
          '問い合わせ内容を読み、カテゴリ（料金・操作・不具合等）と優先度を設定します。\n' +
          'SLA（初回返信期限）を確認し、期限が近い場合はエスカレーションを検討します。\n' +
          '同一顧客の過去チケットを検索し、重複や関連案件がないか確認します。',
        clickX: 40,
        clickY: 45,
      },
      {
        type: 'warning',
        title: '本人確認と個人情報の取り扱い',
        instruction:
          'アカウント情報・契約情報を扱う前に、本人確認を行います（登録メール・契約ID等）。\n' +
          'やり取りに個人情報を含める場合は、必要最小限にとどめます。\n' +
          '社内共有時は顧客名を匿名化するルールがある場合は遵守します。',
        note: '個人情報の漏えい防止は最優先です。不明な場合は上長に確認してください。',
        clickX: 48,
        clickY: 50,
      },
      {
        type: 'normal',
        title: '調査と回答作成',
        instruction:
          '再現手順・ログ・マニュアルを参照し、原因と対処法を整理します。\n' +
          '回答テンプレートをベースに、状況に合わせて文言を調整します。\n' +
          'お客様が次に取るべき操作を番号付きで書き、スクリーンショットがあれば添付します。',
        clickX: 50,
        clickY: 48,
      },
      {
        type: 'check',
        title: '解決確認とクローズ',
        instruction:
          'お客様に解決したか確認し、追加の質問がないか尋ねます。\n' +
          '解決済みの場合、チケットをクローズし、カテゴリ・所要時間を記録します。\n' +
          'FAQ化できる内容はナレッジベースへの追記を検討します。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'web-faq',
    title: 'FAQ（よくある質問）',
    category: 'web',
    targetAudience: ['customer'],
    description: 'Webサービス向けQ&Aページのひな形',
    tags: ['FAQ', 'ヘルプ'],
    imageHint: '該当画面のスクショを各回答に挿入',
    steps: [
      {
        type: 'normal',
        title: 'ログイン・アカウント',
        instruction:
          'Q: ログインできない / パスワードを忘れた\n' +
          'A: メールアドレスの誤り、 caps lock、二段階認証の有無を確認してください。パスワード再設定はログイン画面の「忘れた方」から行えます。\n' +
          'それでも解決しない場合は、登録メールアドレスを添えてサポートへご連絡ください。',
        clickX: 42,
        clickY: 42,
      },
      {
        type: 'normal',
        title: '料金・プラン・請求',
        instruction:
          'Q: プラン変更・解約・請求書の発行\n' +
          'A: 設定画面の「プラン」から変更できます。解約は当月末までに手続きすると翌月から停止します。\n' +
          '請求書が必要な場合は、請求先情報の登録後、ダウンロードまたはメール送付を選択できます。',
        clickX: 48,
        clickY: 48,
      },
      {
        type: 'normal',
        title: '基本的な操作方法',
        instruction:
          'Q: 最初に何をすればよいか / データのエクスポート\n' +
          'A: 初回は「〇〇を登録」→「招待」→「共有」の順がおすすめです。各画面のスクショ付き手順は操作ガイドをご覧ください。\n' +
          'データのエクスポートは設定＞データ管理からCSV/PDFで取得できます。',
        clickX: 50,
        clickY: 50,
      },
      {
        type: 'check',
        title: 'お問い合わせ先',
        instruction:
          '上記で解決しない場合は、{{問い合わせ先}} またはサポートフォームよりご連絡ください。\n' +
          'お問い合わせの際は、利用環境（OS・ブラウザ）とエラーメッセージのスクリーンショットがあるとスムーズです。\n' +
          '対応時間：平日10:00〜18:00（祝日除く）',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'web-howto',
    title: 'Webサービス操作ガイド',
    category: 'web',
    targetAudience: ['developer'],
    description: '画面キャプチャ付きの使い方マニュアル',
    tags: ['チュートリアル', 'SaaS'],
    imageHint: '各ステップにUIの実スクショを挿入',
    steps: [
      {
        type: 'normal',
        title: 'ログインと初期設定',
        instruction:
          '公式URLにアクセスし、Googleまたはメールでログインします。\n' +
          '初回は組織名・タイムゾーン・通知設定を入力し、保存します。\n' +
          'ダッシュボードが表示されれば初期設定は完了です。',
        clickX: 40,
        clickY: 42,
      },
      {
        type: 'normal',
        title: 'ダッシュボードの見方',
        instruction:
          '左サイドバーから主要メニュー（作成・一覧・設定）に移動できます。\n' +
          '上部の検索バーでマニュアル名を検索し、最近使った項目は「最近」に表示されます。\n' +
          '困ったときは右下のヘルプからFAQへ遷移できます。',
        clickX: 48,
        clickY: 48,
      },
      {
        type: 'normal',
        title: '基本操作（登録・編集）',
        instruction:
          '「新規作成」からテンプレートまたは記録でマニュアルを作成します。\n' +
          '編集画面では手順の並び替え・文言修正・画像差し替えができます。変更は自動保存されます。\n' +
          '完成したらプレビューでレイアウトを確認してください。',
        clickX: 50,
        clickY: 50,
      },
      {
        type: 'check',
        title: '共有と完了確認',
        instruction:
          '共有URLまたはQRを発行し、閲覧者がログイン不要で見られることを確認します。\n' +
          'PDF出力が必要な場合はプレビュー画面からダウンロードします。\n' +
          '社内の更新ルールに従い、改訂日をマニュアル名または版ラベルに記載します。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'web-landing-section',
    title: 'LP・サービス紹介（3ブロック）',
    category: 'web',
    targetAudience: ['customer'],
    description: '特徴・使い方・料金の紹介構成',
    tags: ['LP', 'マーケ'],
    imageHint: 'サービス画面・実績画像を各ブロックに',
    steps: [
      {
        type: 'normal',
        title: '課題と解決（ヒーロー下）',
        instruction:
          'ターゲットの課題を「Before」で共感し、「After」でサービスの価値を一言で示します。\n' +
          '専門用語を避け、読了30秒でメリットが伝わる文量にします。',
        clickX: 42,
        clickY: 40,
      },
      {
        type: 'normal',
        title: '3つの特徴',
        instruction:
          '差別化ポイントを3つに絞り、アイコン＋見出し＋2行説明で並べます。\n' +
          '競合との違いがわかるキーワード（価格・速度・サポート等）を入れます。',
        clickX: 48,
        clickY: 48,
      },
      {
        type: 'check',
        title: '始め方・CTA',
        instruction:
          '無料試用・デモ予約・資料ダウンロードなど、次のアクションを1つに絞って配置します。\n' +
          'ボタン文言は「無料で始める」など具体的に。料金ページへのリンクを併設します。',
        clickX: 50,
        clickY: 52,
      },
    ],
  },
  {
    id: 'web-changelog',
    title: 'リリースノート・更新履歴',
    category: 'web',
    targetAudience: ['developer'],
    description: 'バージョンごとの変更点まとめ',
    tags: ['changelog', '更新'],
    imageHint: '変更箇所のビフォーアフター画像',
    steps: [
      {
        type: 'normal',
        title: 'バージョン概要',
        instruction:
          'vX.Y.Z のリリース日と、一言サマリー（例：「まとめて修正を追加」）を記載します。\n' +
          '対象ユーザー（全員 / 特定プランのみ）があれば明記します。',
        clickX: 40,
        clickY: 38,
      },
      {
        type: 'normal',
        title: '新機能・改善',
        instruction:
          '追加された機能ごとに、何ができるようになったか・どこから使うかを記載します。\n' +
          'スクリーンショットまたは短いGIFがあると理解が早まります。',
        clickX: 48,
        clickY: 48,
      },
      {
        type: 'warning',
        title: '破壊的変更・移行手順',
        instruction:
          'API変更・非推奨機能・データ形式の変更がある場合は、移行期限と手順を書きます。\n' +
          '影響を受けるユーザーへの事前通知日も記録します。',
        clickX: 50,
        clickY: 50,
      },
      {
        type: 'check',
        title: '既知の問題・予定',
        instruction:
          '現在把握している不具合と回避策、次バージョンでの対応予定を記載します。\n' +
          'フィードバック窓口へのリンクを添えます。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
  {
    id: 'hospitality-order',
    title: '店舗・注文対応マニュアル',
    category: 'hospitality',
    targetAudience: ['new_staff'],
    description: 'レジ・オーダー・提供の流れ',
    tags: ['飲食', '接客'],
    imageHint: 'POS画面・メニュー写真を挿入',
    steps: [
      {
        type: 'normal',
        title: 'ご来店・ご案内',
        instruction:
          '入口で笑顔で挨拶し、人数と喫煙の有無を確認します。\n' +
          '空席状況を確認し、席カードまたはPOSでテーブルを確保します。\n' +
          'お子様連れ・車椅子の方には、安全な席へご案内します。',
        clickX: 40,
        clickY: 45,
      },
      {
        type: 'normal',
        title: '注文受付・POS入力',
        instruction:
          'メニューを渡し、おすすめやアレルギー表示がある場合は口頭で補足します。\n' +
          'POSに品目・数量・コース・割引を正確に入力し、キッチンプリンタへ送信します。\n' +
          '伝票番号とテーブル番号の対応を間違えないよう、読み上げ確認を推奨します。',
        clickX: 48,
        clickY: 50,
      },
      {
        type: 'check',
        title: '提供・会計・お見送り',
        instruction:
          '料理の提供順を確認し、遅延がある場合はお客様へ一声かけます。\n' +
          '会計時は明細を提示し、ポイントカード・割引券の処理を行います。\n' +
          '「ご来店ありがとうございました」とお見送りし、テーブルの片付けを開始します。',
        clickX: 50,
        clickY: 52,
      },
    ],
  },
  {
    id: 'hospitality-complaint',
    title: 'クレーム対応フロー',
    category: 'hospitality',
    targetAudience: ['admin'],
    description: 'お客様の不満への初動対応',
    tags: ['クレーム', '接客'],
    imageHint: 'エスカレーション連絡先・記録フォーム',
    steps: [
      {
        type: 'warning',
        title: '傾聴と事実確認',
        instruction:
          'まずお客様の話を遮らずに聞き、「ご不快な思いをさせてしまい申し訳ありません」と謝罪します。\n' +
          '何が・いつ・どのように起きたかを事実ベースで確認し、感情と事実を分けて記録します。',
        clickX: 42,
        clickY: 45,
      },
      {
        type: 'normal',
        title: '現場でできる一次対応',
        instruction:
          '店舗ルールの範囲内で代替案（作り直し・返金・次回割引等）を提案します。\n' +
          '判断に迷う金額・内容はその場で約束せず、上長確認後に折り返す旨を伝えます。',
        clickX: 48,
        clickY: 50,
      },
      {
        type: 'check',
        title: '報告・記録・再発防止',
        instruction:
          'クレーム内容・対応・結果を所定の記録簿またはシステムに入力します。\n' +
          '店長・本部へ報告し、再発防止策（手順見直し・研修）をチームで共有します。',
        clickX: 50,
        clickY: 55,
      },
    ],
  },
  {
    id: 'general-checklist',
    title: '業務チェックリスト（汎用）',
    category: 'general',
    targetAudience: ['new_staff'],
    description: '開店前・退勤前などの確認リスト',
    tags: ['チェックリスト'],
    imageHint: '確認箇所の写真を各項目に',
    steps: [
      {
        type: 'check',
        title: '開始前確認',
        instruction:
          '□ 施錠・照明・空調の状態\n' +
          '□ 備品・在庫・清掃状況\n' +
          '□ 当日の連絡事項（掲示・チャット）\n' +
          '不明点は責任者に確認してから業務を開始します。',
        clickX: 40,
        clickY: 42,
      },
      {
        type: 'normal',
        title: '本番作業',
        instruction:
          'チェックリストまたはSOPに沿って作業を進めます。\n' +
          '手順から外れる変更が必要な場合は、事前に承認を得ます。\n' +
          '異常や事故があった場合は、作業を止めて報告します。',
        clickX: 48,
        clickY: 50,
      },
      {
        type: 'check',
        title: '終了時確認',
        instruction:
          '□ 機器の電源OFF・施錠\n' +
          '□ ゴミ出し・清掃\n' +
          '□ 翌日への引き継ぎメモ\n' +
          '完了したらチェックリストに署名・時刻を記入します。',
        clickX: 50,
        clickY: 55,
      },
    ],
  },
  {
    id: 'general-sop',
    title: '標準作業手順書（SOP）',
    category: 'general',
    targetAudience: ['new_staff'],
    description: '品質を揃えるための標準手順',
    tags: ['SOP', '品質'],
    imageHint: '作業工程の写真を順番に',
    steps: [
      {
        type: 'normal',
        title: '目的・適用範囲',
        instruction:
          'この手順の目的（品質・安全・効率のどれを担保するか）を明記します。\n' +
          '適用する業務・担当者・除外するケースを書きます。改訂日と版数も記載します。',
        clickX: 40,
        clickY: 38,
      },
      {
        type: 'normal',
        title: '準備（道具・権限・安全）',
        instruction:
          '必要な道具・保護具・システム権限をリストアップします。\n' +
          '作業前の安全確認（電源・ロックアウト等）を行います。',
        clickX: 45,
        clickY: 45,
      },
      {
        type: 'normal',
        title: '作業手順',
        instruction:
          'ステップごとに操作を番号付きで記載します。判断が必要な分岐はフローで示します。\n' +
          '各ステップに品質チェックポイント（OK/NGの見分け方）を添えます。',
        clickX: 50,
        clickY: 50,
      },
      {
        type: 'warning',
        title: '注意・禁止事項',
        instruction:
          '絶対に行ってはいけない操作、事故事例、法令上の注意を記載します。\n' +
          '緊急時の連絡先と一次対応を併記します。',
        clickX: 48,
        clickY: 52,
      },
      {
        type: 'check',
        title: '完了基準・記録',
        instruction:
          '正しく完了した状態を文章と写真で示します。\n' +
          '記録の残し方（ログ・署名・写真保存）を明記し、責任者確認のタイミングを書きます。',
        clickX: 45,
        clickY: 55,
      },
    ],
  },
];
