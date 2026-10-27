import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, UserCircle2 } from 'lucide-react';
import {
  createPersona,
  archivePersona,
  fetchPersonas,
  type PersonaRecord,
  type PersonaType,
} from '../lib/api';
import { usePersona } from '../store/personaContext';
import DualApprovalSetupBanner from './DualApprovalSetupBanner';

const TYPE_OPTIONS: { id: PersonaType; label: string; hint: string }[] = [
  { id: 'official', label: '公式アカウント', hint: '投稿前承認が推奨されます' },
  { id: 'personal', label: '個人ブランド', hint: '院長・スタッフ個人など' },
  { id: 'character', label: 'キャラクター', hint: 'メディト君などの公式キャラ' },
];

export default function PersonaManagementSection() {
  const { refreshPersonas, limits, personas: ctxPersonas } = usePersona();
  const [personas, setPersonas] = useState<PersonaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PersonaType>('character');
  const [brandProfile, setBrandProfile] = useState('');

  const load = () => {
    setLoading(true);
    fetchPersonas()
      .then((data) => setPersonas(data.personas))
      .catch(() => setMessage('ペルソナ一覧の取得に失敗しました'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [ctxPersonas.length]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await createPersona({
        name: name.trim(),
        type,
        brandProfile: brandProfile.trim() || undefined,
      });
      setName('');
      setBrandProfile('');
      await refreshPersonas();
      load();
      setMessage('ペルソナを追加しました。ヘッダーから切り替えて SNS を連携してください。');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (personaId: string, personaName: string) => {
    if (!window.confirm(`「${personaName}」を削除しますか？SNS連携と投稿キューは残りますが、一覧から非表示になります。`)) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await archivePersona(personaId);
      await refreshPersonas();
      load();
      setMessage('ペルソナを削除しました');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        読み込み中…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">配信キャラ（ペルソナ）</h3>
        <p className="mt-1 text-xs text-neutral-500">
          公式・院長・キャラクターなど、投稿主体ごとに SNS 連携とトーンを分けて管理できます。
          下のフォームから<strong className="text-neutral-700">名前を入力して「ペルソナを追加」</strong>してください。
          {limits && (
            <span className="ml-1 text-neutral-600">（{limits.label}）</span>
          )}
        </p>
        {limits?.devFullAccess && (
          <p className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
            メディトク社内アカウント: 開発モードで全機能（Enterprise 相当）が利用できます。
          </p>
        )}
        {personas.some((p) => p.type === 'official') && (
          <div className="mt-3">
            <DualApprovalSetupBanner />
          </div>
        )}
      </div>

      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80">
        {personas.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <UserCircle2 className="h-8 w-8 shrink-0 text-neutral-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {TYPE_OPTIONS.find((t) => t.id === p.type)?.label ?? p.type}
                  {p.xConnected ? ' · X連携済' : ''}
                  {p.metaConnected ? ' · Meta連携済' : ''}
                </p>
              </div>
            </div>
            {personas.length > 1 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleArchive(p.id, p.name)}
                className="shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                title="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {limits?.canAdd && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-4 space-y-3">
          <p className="text-xs font-medium text-neutral-700">新しい配信キャラを追加</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: メディト君 / むしゃら院長"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PersonaType)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} — {opt.hint}
              </option>
            ))}
          </select>
          <textarea
            value={brandProfile}
            onChange={(e) => setBrandProfile(e.target.value)}
            placeholder="このキャラの口調・禁止事項（任意）"
            rows={2}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            ペルソナを追加
          </button>
        </div>
      )}

      {!limits?.canAdd && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          ペルソナ上限に達しています。プランタブで「追加ペルソナ枠」を購入するか、管理者に連絡してください（¥980/月/体）。
        </p>
      )}

      {message && (
        <p className="text-xs text-neutral-600 bg-neutral-100 rounded-lg px-3 py-2">{message}</p>
      )}
    </div>
  );
}
