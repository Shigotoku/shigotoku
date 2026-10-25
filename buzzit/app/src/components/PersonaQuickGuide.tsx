import { Link } from 'react-router-dom';
import { UserCircle2 } from 'lucide-react';
import { settingsPath } from '../lib/settingsUrls';

type Variant = 'card' | 'inline';

export default function PersonaQuickGuide({ variant = 'card', onNavigate }: { variant?: Variant; onNavigate?: () => void }) {
  const to = settingsPath({ tab: 'personas' });

  if (variant === 'inline') {
    return (
      <p className="text-xs text-neutral-600">
        配信キャラの追加は
        <Link to={to} onClick={onNavigate} className="mx-1 font-semibold text-violet-800 underline underline-offset-2">
          設定 → 配信キャラ
        </Link>
        タブで行います（プランタブでは追加できません）。
      </p>
    );
  }

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/80 p-4">
      <div className="flex items-start gap-3">
        <UserCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-violet-950">配信キャラを追加する場所</p>
          <p className="text-xs leading-relaxed text-violet-900/90">
            メディト君・むしゃら院長・公式アカウントなどは、
            <strong>設定画面の「配信キャラ」タブ</strong>で追加します。
            プランタブの「追加ペルソナ枠」は課金枠の数だけで、キャラ自体の登録は別画面です。
          </p>
          <Link
            to={to}
            onClick={onNavigate}
            className="inline-flex items-center rounded-lg bg-violet-800 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-900"
          >
            配信キャラを追加・管理 →
          </Link>
        </div>
      </div>
    </div>
  );
}
