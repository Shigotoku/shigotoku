import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle2 } from 'lucide-react';
import { usePersona } from '../store/personaContext';
import { settingsPath } from '../lib/settingsUrls';

const SESSION_KEY = 'buzzit-persona-session-v1';

const TYPE_LABELS: Record<string, string> = {
  official: '公式',
  personal: '個人',
  character: 'キャラ',
};

/**
 * セッション開始時に配信キャラを明示的に選ばせる（誤投稿防止）。
 */
export default function PersonaSelectGate() {
  const { personas, activePersonaId, loading, switching, switchPersona, refreshPersonas } = usePersona();
  const [open, setOpen] = useState(false);
  const [pickId, setPickId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshPersonas().catch(() => {});
  }, [refreshPersonas]);

  useEffect(() => {
    const sync = () => {
      if (loading || switching) return;
      if (!personas.length) {
        setOpen(true);
        setPickId(null);
        return;
      }
      let confirmed: string | null = null;
      try {
        confirmed = sessionStorage.getItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
      const id = activePersonaId ?? personas[0]?.id ?? null;
      setPickId(id);
      setOpen(confirmed !== id);
    };
    sync();
    window.addEventListener('buzzit-persona-changed', sync);
    return () => window.removeEventListener('buzzit-persona-changed', sync);
  }, [personas, activePersonaId, loading, switching]);

  const confirm = async () => {
    if (!pickId) return;
    setError(null);
    try {
      if (pickId !== activePersonaId) {
        await switchPersona(pickId);
      }
      try {
        sessionStorage.setItem(SESSION_KEY, pickId);
      } catch {
        /* ignore */
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '配信キャラの設定に失敗しました');
    }
  };

  if (!open) return null;

  const personasPath = settingsPath({ tab: 'personas' });

  return (
    <div className="buzz-modal-overlay z-[70]" role="dialog" aria-modal aria-labelledby="persona-gate-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl buzz-fade-in">
        <div className="border-b border-neutral-100 bg-violet-50 px-6 py-4">
          <div className="flex items-start gap-3">
            <UserCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-violet-800" />
            <div>
              <h2 id="persona-gate-title" className="text-lg font-bold text-neutral-900">
                まず配信キャラを選んでください
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                投稿・予約は選んだキャラの SNS 連携に紐づきます。作業前に必ず確認してください。
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-6 py-4">
          {personas.length === 0 ? (
            <p className="text-sm text-neutral-600">
              配信キャラがまだありません。設定でキャラを追加してから続けてください。
            </p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {personas.map((persona) => (
                <li key={persona.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      pickId === persona.id
                        ? 'border-violet-600 bg-violet-50 ring-1 ring-violet-600'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="persona-gate"
                      className="mt-1"
                      checked={pickId === persona.id}
                      onChange={() => setPickId(persona.id)}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-neutral-900">{persona.name}</span>
                      <span className="text-xs text-neutral-500">
                        {TYPE_LABELS[persona.type] ?? persona.type}
                        {persona.id === activePersonaId ? ' · 現在の選択' : ''}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>

        <div className="flex flex-col gap-2 border-t border-neutral-100 px-6 py-4 sm:flex-row sm:justify-end">
          {personas.length === 0 ? (
            <Link to={personasPath} className="buzz-btn-primary w-full text-center sm:w-auto">
              配信キャラを追加する
            </Link>
          ) : (
            <button
              type="button"
              disabled={!pickId || switching}
              onClick={() => void confirm()}
              className="buzz-btn-primary w-full disabled:opacity-60 sm:w-auto"
            >
              {switching ? '反映中…' : 'このキャラで作業を始める'}
            </button>
          )}
          <Link
            to={personasPath}
            className="inline-flex min-h-[44px] w-full items-center justify-center border border-neutral-300 px-4 text-sm sm:w-auto"
          >
            キャラを追加・管理
          </Link>
        </div>
      </div>
    </div>
  );
}
