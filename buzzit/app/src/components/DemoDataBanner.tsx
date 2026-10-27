import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

type Props = {
  /** true = サンプル表示中 */
  isSample: boolean;
  className?: string;
};

/** ダッシュボード等がサンプル数値のときに明示する */
export default function DemoDataBanner({ isSample, className = '' }: Props) {
  if (!isSample) {
    return (
      <div
        className={`flex items-start gap-2 border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 ${className}`}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">本番データ表示中</span>
          — 連携済みアカウントの数値・予約ジョブを反映しています。
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">いまはサンプル表示です</span>
          — 連携が完了すると、実際のスコア・リーチ・承認待ちに切り替わります。数字は参考例です。
        </p>
      </div>
      <Link
        to="/settings"
        className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline"
      >
        連携設定へ
      </Link>
    </div>
  );
}
