import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle2 } from 'lucide-react';
import { usePersona } from '../store/personaContext';
import { settingsPath } from '../lib/settingsUrls';

/**
 * 配信キャラが1件もないときだけ案内する（切り替え時の全画面ゲートは出さない）。
 */
export default function PersonaSelectGate() {
  const { personas, loading, refreshPersonas } = usePersona();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    refreshPersonas()
      .catch(() => {})
      .finally(() => setReady(true));
  }, [refreshPersonas]);

  if (!ready || loading || personas.length > 0) return null;

  const personasPath = settingsPath({ tab: 'personas' });

  return (
    <div className="buzz-modal-overlay z-[70]" role="dialog" aria-modal aria-labelledby="persona-empty-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl buzz-fade-in">
        <div className="flex items-start gap-3">
          <UserCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-violet-800" />
          <div>
            <h2 id="persona-empty-title" className="text-lg font-bold text-neutral-900">配信キャラを追加してください</h2>
            <p className="mt-2 text-sm text-neutral-600">
              投稿・予約を始めるには、まず配信キャラ（公式・院長・キャラなど）を1つ登録します。右上のメニューからいつでも切り替えられます。
            </p>
            <Link to={personasPath} className="buzz-btn-primary mt-4 inline-flex">
              配信キャラを追加する
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
