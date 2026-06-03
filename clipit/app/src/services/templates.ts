import type { TargetAudience } from '../types';

export interface ManualTemplate {
  id: string;
  title: string;
  category: string;
  targetAudience: TargetAudience[];
  description: string;
  steps: { title: string; instruction: string; type: 'normal' | 'warning' | 'check' }[];
}

export const MANUAL_TEMPLATES: ManualTemplate[] = [
  {
    id: 'clinic-reception',
    title: '新患受付の手順',
    category: 'clinic',
    targetAudience: ['new_staff'],
    description: '受付での新患対応の基本フロー',
    steps: [
      { type: 'normal', title: '受付票の確認', instruction: '新患の受付票・保険証を確認し、システムに患者情報を登録します。' },
      { type: 'normal', title: '問診票の案内', instruction: '問診票の記入を案内し、記入完了後に受け取ります。' },
      { type: 'check', title: '待合へ案内', instruction: '診察順を伝え、待合スペースへ案内して完了です。' },
    ],
  },
  {
    id: 'clinic-accounting',
    title: '会計・レセプト入力',
    category: 'clinic',
    targetAudience: ['new_staff', 'admin'],
    description: '診察後の会計処理',
    steps: [
      { type: 'normal', title: '診療内容の確認', instruction: '電子カルテの診療内容と会計画面が一致しているか確認します。' },
      { type: 'warning', title: '未収・特例の確認', instruction: '自己負担額や特例措置がないか、マニュアル記載どおりに確認します。' },
      { type: 'check', title: '会計完了', instruction: '領収書を渡し、次回予約の有無を確認して終了します。' },
    ],
  },
  {
    id: 'smb-expense',
    title: '経費精算の申請',
    category: 'smb',
    targetAudience: ['customer'],
    description: '社内経費精算の基本手順',
    steps: [
      { type: 'normal', title: '領収書の撮影', instruction: '領収書をスマホで撮影し、経費システムにアップロードします。' },
      { type: 'normal', title: '科目・金額入力', instruction: '勘定科目と金額を入力し、用途を一言で記載します。' },
      { type: 'check', title: '申請送信', instruction: '上長承認フローに回し、承認待ちになったら完了です。' },
    ],
  },
];
