import { Link } from 'react-router-dom';
import { usePersona } from '../store/personaContext';
import { personaSnsLinks } from '../lib/personaSnsStatus';
import { settingsPath } from '../lib/settingsUrls';

/** ヘッダーの配信キャラ名の右隣に出す SNS 連携状況（X 未連携 / Instagram 連携済 など） */
export default function PersonaSnsHeaderChips() {
  const { activePersona } = usePersona();
  if (!activePersona) return null;

  return (
    <div className="hidden items-center gap-1 md:flex" aria-label="SNS連携状況">
      {personaSnsLinks(activePersona).map((l) => (
        <Link
          key={l.id}
          to={settingsPath({ section: l.settingsSection })}
          title={l.connected ? `${l.label} 連携済み` : `${l.label} をこのキャラで連携`}
          className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            l.connected
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          {l.label}
          {l.connected ? '連携済' : '未連携'}
        </Link>
      ))}
    </div>
  );
}
