import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Eye, EyeOff, Loader2, Plus, Trash2, UserCircle2 } from 'lucide-react';
import {
  fetchAccountLedger,
  fetchPersonas,
  saveAccountLedger,
  type AccountLedgerEntry,
  type PersonaRecord,
} from '../lib/api';

const SERVICE_PRESETS = ['X', 'Instagram', 'TikTok', 'Facebook', 'Threads', 'YouTube', 'LINE公式', 'Googleビジネス', 'ホットペッパー', 'その他'];

function newEntry(service = ''): AccountLedgerEntry {
  return { id: `new-${Math.random().toString(36).slice(2, 10)}`, service, handle: '', email: '', password: '', url: '', memo: '' };
}

function PersonaLedger({ persona }: { persona: PersonaRecord }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<AccountLedgerEntry[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    fetchAccountLedger(persona.id)
      .then((d) => {
        setEntries(d.entries);
        setCount(d.entries.length);
        setLoaded(true);
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : '取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [open, loaded, persona.id]);

  const update = (id: string, patch: Partial<AccountLedgerEntry>) =>
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveAccountLedger(persona.id, entries.filter((e) => e.service.trim()));
      const d = await fetchAccountLedger(persona.id);
      setEntries(d.entries);
      setCount(d.entries.length);
      setMessage('保存しました');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm';

  return (
    <li className="rounded-xl border border-neutral-200/80 bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <UserCircle2 className="h-8 w-8 shrink-0 text-neutral-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{persona.name}</p>
          <p className="text-xs text-neutral-500">
            {count === null ? 'クリックでアカウント一覧を表示' : `登録 ${count} 件`}
          </p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-neutral-100 px-4 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" /> 読み込み中…
            </div>
          )}
          {loaded && entries.length === 0 && (
            <p className="text-xs text-neutral-500">まだ登録がありません。下のボタンからサービスを追加してください。</p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
              <div className="flex items-center gap-2">
                <input
                  list="ledger-services"
                  value={e.service}
                  onChange={(ev) => update(e.id, { service: ev.target.value })}
                  placeholder="サービス名（例: Instagram）"
                  className={`${input} font-medium`}
                />
                {e.url && (
                  <a href={e.url} target="_blank" rel="noreferrer" title="開く" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  title="削除"
                  onClick={() => setEntries((l) => l.filter((x) => x.id !== e.id))}
                  className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={e.handle ?? ''} onChange={(ev) => update(e.id, { handle: ev.target.value })} placeholder="アカウントID / @ユーザー名" className={input} />
                <input value={e.email ?? ''} onChange={(ev) => update(e.id, { email: ev.target.value })} placeholder="登録メールアドレス" className={input} autoComplete="off" />
                <div className="relative">
                  <input
                    type={shown[e.id] ? 'text' : 'password'}
                    value={e.password ?? ''}
                    onChange={(ev) => update(e.id, { password: ev.target.value })}
                    placeholder="パスワード"
                    className={`${input} pr-10`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShown((s) => ({ ...s, [e.id]: !s[e.id] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    title={shown[e.id] ? '隠す' : '表示'}
                  >
                    {shown[e.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <input value={e.url ?? ''} onChange={(ev) => update(e.id, { url: ev.target.value })} placeholder="アカウントのURL（https://…）" className={input} />
              </div>
              <input value={e.memo ?? ''} onChange={(ev) => update(e.id, { memo: ev.target.value })} placeholder="メモ（2段階認証の電話番号など）" className={input} />
            </div>
          ))}

          {loaded && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEntries((l) => [...l, newEntry()])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                <Plus className="h-4 w-4" /> サービスを追加
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                このキャラの台帳を保存
              </button>
            </div>
          )}
          {message && <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">{message}</p>}
        </div>
      )}
    </li>
  );
}

export default function AccountLedgerSection() {
  const [personas, setPersonas] = useState<PersonaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonas()
      .then((d) => setPersonas(d.personas))
      .catch(() => setError('キャラ一覧の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> 読み込み中…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">アカウント台帳</h3>
        <p className="mt-1 text-xs text-neutral-500">
          キャラごとに、SNS等の登録アカウント（ID・メール・パスワード・URL）をまとめて確認・管理できます。
          キャラ名をクリックすると一覧が開きます。閲覧・編集できるのは編集権限以上のメンバーのみです。
        </p>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          パスワードはこの台帳に保存されます。共有範囲に注意し、可能なら専用のパスワードを使ってください。
        </p>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <datalist id="ledger-services">
        {SERVICE_PRESETS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <ul className="space-y-3">
        {personas.map((p) => (
          <PersonaLedger key={p.id} persona={p} />
        ))}
      </ul>
    </div>
  );
}
