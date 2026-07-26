import { loadOnboarding } from './onboarding';

export type SetupSignals = {
  metaConnected: boolean;
  lineConnected: boolean;
  hasDestinationUrl: boolean;
  hasScheduledOrPost: boolean;
  hasLineStep: boolean;
  /** APIから実データを取れたか（サンプル表示の判定） */
  liveDashboard: boolean;
};

export type SetupItem = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  ctaLabel: string;
  ctaPath: string;
};

export function buildSetupItems(signals: SetupSignals): SetupItem[] {
  const onboarding = loadOnboarding();
  return [
    {
      id: 'onboarding',
      title: 'はじめに（業種・目的）を設定',
      detail: onboarding.skipped
        ? 'スキップ済み。あとから伴走ガイドで見直せます'
        : '業種と一番の目的を決めると提案が具体になります',
      done: onboarding.completed && !onboarding.skipped,
      ctaLabel: onboarding.completed ? '設定を見直す' : '今すぐ設定',
      ctaPath: onboarding.completed ? '/onboarding?edit=1' : '/onboarding',
    },
    {
      id: 'meta',
      title: 'Instagram（Meta）を連携',
      detail: 'リール・投稿の予約に必要です',
      done: signals.metaConnected,
      ctaLabel: '設定で連携',
      ctaPath: '/settings',
    },
    {
      id: 'line',
      title: 'LINE公式を連携',
      detail: '友だち追加・ステップ配信・リピートに必要です',
      done: signals.lineConnected,
      ctaLabel: '設定で連携',
      ctaPath: '/settings',
    },
    {
      id: 'destination',
      title: '予約・来店のURLを登録',
      detail: 'プロフィールや投稿の行き先を1本に決めます',
      done: signals.hasDestinationUrl,
      ctaLabel: '予約URLを入れる',
      ctaPath: '/settings',
    },
    {
      id: 'first-post',
      title: '最初の投稿を予約する',
      detail: 'マジック・クリエイターで1本作れば運用が始まります',
      done: signals.hasScheduledOrPost,
      ctaLabel: '台本を作る',
      ctaPath: '/magic-creator',
    },
    {
      id: 'line-step',
      title: 'LINEウェルカムシナリオを1本',
      detail: '友だち追加後の自動フォローで取りこぼしを防ぎます',
      done: signals.hasLineStep,
      ctaLabel: 'LINE CRMへ',
      ctaPath: '/line-crm',
    },
  ];
}

export function setupProgress(items: SetupItem[]): {
  doneCount: number;
  total: number;
  percent: number;
  next: SetupItem | null;
} {
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const next = items.find((i) => !i.done) ?? null;
  return { doneCount, total, percent, next };
}
