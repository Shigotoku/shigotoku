import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Lock, Unlock } from 'lucide-react';
import { usePersona } from '../store/personaContext';
import { personaSnsLinks } from '../lib/personaSnsStatus';
import { settingsPath } from '../lib/settingsUrls';
import { isPersonaLocked, setPersonaLocked } from '../lib/personaLock';

/**
 * ヘッダー内（キャラ切替ボタンの左）に並べる、キャラ固定＆SNS連携状況ボタン群。
 */
export default function ActivePersonaContextBar() {
  const { activePersona, refreshPersonas, loading } = usePersona();
  const [locked, setLocked] = useState(() => isPersonaLocked());

  useEffect(() => {
    const onLock = () => setLocked(isPersonaLocked());
    window.addEventListener('buzzit-persona-lock-changed', onLock);
    return () => window.removeEventListener('buzzit-persona-lock-changed', onLock);
  }, []);

  useEffect(() => {
    refreshPersonas().catch(() => {});
    const onPersona = () => refreshPersonas().catch(() => {});
    window.addEventListener('buzzit-persona-changed', onPersona);
    return () => window.removeEventListener('buzzit-persona-changed', onPersona);
  }, [refreshPersonas]);

  if (!activePersona || loading) return null;

  const links = personaSnsLinks(activePersona);

  return (
    <div className="hidden flex-wrap items-center justify-end gap-1.5 md:flex">
      <button
        type="button"
        onClick={() => setPersonaLocked(!locked)}
        title={locked ? 'キャラ固定を解除' : 'このキャラに固定（誤切替防止）'}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
          locked
            ? 'border-violet-700 bg-violet-800 text-white'
            : 'border-violet-300 bg-white text-violet-900 hover:bg-violet-100'
        }`}
      >
        {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        {locked ? 'キャラ固定中' : 'キャラを固定'}
      </button>
      {links.map((link) => (
        <Link
          key={link.id}
          to={settingsPath({ section: link.settingsSection })}
          title={link.connected ? `${link.label} 連携済み` : `${link.label} をこのキャラで連携`}
          className={`inline-flex max-w-[10rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            link.connected
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          <Link2 className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">
            {link.label}
            {link.connected ? (link.detail ? ` ${link.detail}` : ' 済') : ' 未連携'}
          </span>
        </Link>
      ))}
    </div>
  );
}
