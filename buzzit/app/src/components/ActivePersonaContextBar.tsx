import { useEffect, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { usePersona } from '../store/personaContext';
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

  // SNSの連携状況はサイドバー「SNSごとの管理」の各媒体の右に「未」で表示する
  return (
    <div className="hidden items-center md:flex">
      <button
        type="button"
        onClick={() => setPersonaLocked(!locked)}
        title={locked ? 'キャラ固定を解除' : 'このキャラに固定（誤切替防止）'}
        aria-label={locked ? 'キャラ固定を解除' : 'このキャラに固定'}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
          locked
            ? 'border-violet-700 bg-violet-800 text-white'
            : 'border-violet-300 bg-white text-violet-900 hover:bg-violet-100'
        }`}
      >
        {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
