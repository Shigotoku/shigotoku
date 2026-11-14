import { Link } from 'react-router-dom';
import { Sun } from 'lucide-react';
import SetupDiagnosisCard from '../components/SetupDiagnosisCard';
import { landingPath } from '../lib/urls';
import DemoDataBanner from '../components/DemoDataBanner';
import { useSetupSignals } from '../hooks/useSetupSignals';

const FIRST_STEPS = [
  { step: '1', label: 'ネタを溜める', to: '/inbox', hint: 'ネタInbox に思いついたことをメモします' },
  { step: '2', label: '各SNS用に作る', to: '/magic-creator', hint: 'ネタクリエイターで媒体別の投稿文を作ります' },
  { step: '3', label: '媒体で整えて予約', to: '/sns/instagram', hint: '各SNSのページで仕上げて予約します' },
  { step: '4', label: '全体を確認', to: '/calendar', hint: '投稿カレンダーで予定を確認します' },
];

const MORNING = [
  { label: 'ダッシュボードを開く', hint: '左のカレンダーで今日の投稿予定、右で数字を確認します' },
  { label: '承認待ちを処理する', hint: '承認待ちの投稿があれば、内容を見て承認します' },
  { label: '失敗した投稿を直す', hint: '赤い警告が出ていたらカレンダーから再試行します' },
  { label: 'ネタを1つ足す', hint: 'ネタInbox に今日気づいたことを1行メモします' },
];

const AI_STEPS = [
  { label: '配信キャラを選ぶ', hint: '左下でAIに任せたいキャラ（例: 徳永龍馬）に切り替えます' },
  { label: 'AI連携のURLをコピー', hint: '設定 → 配信キャラ → AI連携で「ChatGPT / Claude（Web）」を選び、URLをコピーします' },
  { label: 'AI側に登録して許可', hint: 'AIのコネクタ（カスタム/MCP）にURLを貼り、バジットのログイン画面でキャラを選んで「許可」を押します' },
  { label: '依頼文を送る', hint: '同じ画面の依頼文をAIに貼ると、下書きが作られます。内容はカレンダーで確認してから承認します' },
];

export default function GuidePage() {
  const { signals, isSample } = useSetupSignals();

  return (
    <div className="buzz-page">
      <DemoDataBanner isSample={isSample} />

      <section className="buzz-card-pad !p-4 sm:!p-5">
        <p className="buzz-section-label">STEP 0　最初の準備</p>
        <p className="mt-2 text-sm text-neutral-600">
          事業所の特徴や、配信キャラごとの SNS 連携・アカウント台帳を先に整えておくと、投稿文にも反映されやすくなります。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/settings?tab=personas" className="buzz-btn-secondary !px-3 !py-2 text-sm">配信キャラを設定</Link>
          <Link to="/onboarding?edit=1" className="buzz-btn-secondary !px-3 !py-2 text-sm">業種・目的の見直し</Link>
          <Link to="/settings?tab=sns" className="buzz-btn-secondary !px-3 !py-2 text-sm">SNS連携</Link>
        </div>
      </section>

      <SetupDiagnosisCard signals={signals} />

      <section className="buzz-card-pad !p-4 sm:!p-5">
        <p className="buzz-section-label">はじめての流れ</p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-4">
          {FIRST_STEPS.map((item) => (
            <li key={item.step}>
              <Link
                to={item.to}
                className="block h-full rounded-xl border border-neutral-200/80 bg-neutral-50 p-3 transition-colors hover:border-violet-200 hover:bg-violet-50/50"
              >
                <p className="text-[10px] font-semibold text-violet-600">STEP {item.step}</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{item.label}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{item.hint}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="buzz-card-pad !p-4 sm:!p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
          <Sun className="h-4 w-4 text-amber-500" />
          毎朝5分ルーティン
        </div>
        <ol className="mt-3 grid gap-3 md:grid-cols-4">
          {MORNING.map((m, i) => (
            <li key={m.label} className="border-l-2 border-violet-500 pl-3">
              <p className="text-xs text-neutral-500">{i + 1}</p>
              <p className="text-sm font-semibold text-neutral-900">{m.label}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{m.hint}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-neutral-500">
          もっと詳しく進めたい場合は上のタブの{' '}
          <Link to="/roadmap" className="underline-offset-2 hover:underline">成長ロードマップ</Link>、または{' '}
          <a href={landingPath('/guide/')} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">使い方説明書（外部サイト）</a> を参考にしてください。
        </p>
      </section>

      <section className="buzz-card-pad !p-4 sm:!p-5">
        <p className="buzz-section-label">AIにつなぐ（ChatGPT・Claude・Cursor）</p>
        <p className="mt-2 text-sm text-neutral-600">
          AIがネタや下書きをバジットに直接書き込みます。AIにできるのは「ネタ追加」と「下書き作成」だけで、承認・予約・投稿は必ずご自身で行います。
        </p>
        <ol className="mt-3 grid gap-3 md:grid-cols-4">
          {AI_STEPS.map((s, i) => (
            <li key={s.label} className="border-l-2 border-violet-500 pl-3">
              <p className="text-xs text-neutral-500">STEP {i + 1}</p>
              <p className="text-sm font-semibold text-neutral-900">{s.label}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{s.hint}</p>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/settings?tab=personas" className="buzz-btn-secondary !px-3 !py-2 text-sm">設定 → 配信キャラ → AI連携を開く</Link>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          ChatGPT の画面にコネクタ／アプリの追加が見つからない場合は、Cursor・Claude Code・Gemini CLI（キーを発行して設定を貼る方式）をご利用ください。
        </p>
      </section>
    </div>
  );
}
