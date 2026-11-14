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

        <div className="mt-5 border-t border-neutral-100 pt-4">
          <p className="text-sm font-semibold text-neutral-900">ChatGPT での登録手順（Plus 以上）</p>
          <ol className="mt-3 space-y-5 text-sm text-neutral-700">
            <li>
              <p><span className="font-semibold">① URL をコピーする。</span>バジットで「設定 → 配信キャラ → AI連携」を開き、「ChatGPT / Claude（Web）」を選んで MCP サーバー URL をコピーします。</p>
            </li>
            <li>
              <p><span className="font-semibold">② ChatGPT でカスタム MCP サーバーを追加する。</span>ChatGPT の「プラグイン」画面（chatgpt.com/plugins）の右上メニューから「カスタム MCP サーバーを追加」を選び、次のように入力して「プラグインとして作成」を押します。</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-neutral-600">
                <li>名前: 「BuzzIt ○○」など分かりやすい名前</li>
                <li>接続タイプ: サーバーURL ／ URL: ①でコピーしたもの</li>
                <li>認証: <strong>OAuth</strong></li>
                <li>「理解したうえで続けます」にチェック</li>
                <li>アイコン（任意）: 画面右の「アイコン画像」をダウンロードして設定すると、一覧にバジットのロゴが出ます（PNG・10KB以内）</li>
              </ul>
              <div className="mt-2 flex flex-wrap items-start gap-4">
                <img src="/guide/ai-connect-1.png" alt="カスタムMCPサーバーの追加画面" className="w-full max-w-sm rounded-lg border border-neutral-200" />
                <div className="text-xs text-neutral-500">
                  <img src="/icon-256.png" alt="BuzzIt アイコン" className="h-16 w-16 rounded-xl border border-neutral-200" />
                  <a href="/icon-256.png" download="buzzit-icon.png" className="mt-1 inline-block underline-offset-2 hover:underline">アイコン画像をダウンロード</a>
                </div>
              </div>
            </li>
            <li>
              <p><span className="font-semibold">③ 「接続」を押す。</span>「○○ を接続する」の確認が出たら、青／黒の「接続」ボタンを押します。バジットのログイン画面が開きます。</p>
            </li>
            <li>
              <p><span className="font-semibold">④ バジットで「許可する」。</span>ログインし、<strong>AIに任せたい配信キャラ</strong>を選んで「許可する」を押します。下書きはここで選んだキャラの名義で作られます。</p>
              <img src="/guide/ai-connect-2.png" alt="AIアプリの接続を許可する画面" className="mt-2 w-full max-w-sm rounded-lg border border-neutral-200" />
            </li>
            <li>
              <p><span className="font-semibold">⑤ 依頼する。</span>ChatGPT で新しいチャットを開き、追加した BuzzIt を有効にして、AI連携画面の「AIに送る依頼文」を貼ります。「X向けに来週分3本の下書きを作って」のように一言添えると、バジットに下書きが作られます。内容はカレンダーで確認し、承認・予約はご自身で行います。</p>
            </li>
          </ol>
          <p className="mt-4 text-xs text-neutral-500">
            ChatGPT の画面に「カスタム MCP サーバーを追加」が見つからない場合は、Cursor・Claude Code・Gemini CLI（キーを発行して設定を貼る方式）をご利用ください。接続はいつでも「設定 → AI連携」から解除できます。
          </p>
        </div>
      </section>
    </div>
  );
}
