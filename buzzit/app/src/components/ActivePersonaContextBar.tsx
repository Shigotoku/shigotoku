import { useEffect, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Link2, UserCircle2 } from 'lucide-react';
import { usePersona } from '../store/personaContext';
import { personaSnsLinks, personaTypeLabel } from '../lib/personaSnsStatus';
import { settingsPath } from '../lib/settingsUrls';
import { isPersonaLocked, setPersonaLocked } from '../lib/personaLock';

/**
 * 画面上部で「今どのキャラの SNS として作業しているか」を常時表示する。
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
  const missing = links.filter((l) => !l.connected);

  return (
    <div className="shrink-0 border-b border-violet-200/80 bg-gradient-to-r from-violet-50/95 to-white px-4 py-2.5 lg:px-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-800" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-violet-950">
              いまの配信キャラ: <span className="text-violet-900">{activePersona.name}</span>
              <span className="ml-1.5 font-normal text-violet-700/90">（{personaTypeLabel(activePersona.type)}）</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-violet-900/80">
              ネタ作成・予約・承認・自動投稿はすべてこのキャラに紐づきます。別キャラの SNS には送られません。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
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
      </div>
      {missing.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {missing.map((m) => m.label).join('・')} は未連携です。このキャラで投稿する前に
            <Link to={settingsPath({ tab: 'sns' })} className="mx-1 font-semibold underline underline-offset-2">
              設定 → SNS連携
            </Link>
            で接続してください。
          </span>
        </p>
      )}
    </div>
  );
}
