import { useEffect, useMemo, useState } from 'react';
import { Shield, RefreshCw, Building2, User } from 'lucide-react';
import {
  fetchAdminAccounts,
  fetchAdminMe,
  updateAdminAccount,
  type AdminAccountRow,
} from '../lib/api';

const PLAN_OPTIONS = ['free', 'line_lite', 'line_pro', 'starter', 'pro', 'growth', 'enterprise'] as const;
const STATUS_OPTIONS = ['monitor', 'trial', 'active', 'past_due', 'cancelled'] as const;

export default function AdminAccountsPage() {
  const [admin, setAdmin] = useState(false);
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'monitor' | 'active' | 'individual' | 'business'>('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editExempt, setEditExempt] = useState(false);
  const [editReason, setEditReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const me = await fetchAdminMe();
      setAdmin(me.admin);
      if (!me.admin) return;
      const res = await fetchAdminAccounts();
      setAccounts(res.accounts);
    } catch {
      setAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (filter === 'monitor') return a.billingStatus === 'monitor' || a.billingExempt;
      if (filter === 'active') return a.billingStatus === 'active' && !a.billingExempt;
      if (filter === 'individual') return a.accountType === 'individual';
      if (filter === 'business') return a.accountType === 'business';
      return true;
    });
  }, [accounts, filter]);

  const startEdit = (row: AdminAccountRow) => {
    setEditingId(row.id);
    setEditPlan(row.plan);
    setEditStatus(row.billingStatus);
    setEditExempt(!!row.billingExempt);
    setEditReason(row.billingExemptReason ?? '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateAdminAccount(editingId, {
        plan: editPlan,
        billingStatus: editStatus,
        billingExempt: editExempt,
        billingExemptReason: editReason || undefined,
        billingExemptType: editExempt ? 'monitor' : undefined,
      });
      setMessage('更新しました');
      setEditingId(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  if (loading) {
    return <div className="buzz-page text-sm text-neutral-500">読み込み中...</div>;
  }

  if (!admin) {
    return (
      <div className="buzz-page">
        <p className="buzz-alert buzz-alert-error">管理者権限が必要です</p>
      </div>
    );
  }

  return (
    <div className="buzz-page space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-neutral-500">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Admin</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold">アカウント管理</h1>
          <p className="mt-2 text-sm text-neutral-600">
            モニター / 課金、個人 / 法人、プランを一覧で管理します。
          </p>
        </div>
        <button type="button" onClick={() => load()} className="buzz-btn-secondary">
          <RefreshCw className="h-4 w-4" />
          再読み込み
        </button>
      </div>

      {message && <p className="buzz-alert buzz-alert-success">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'すべて'],
          ['monitor', 'モニター'],
          ['active', '課金中'],
          ['individual', '個人'],
          ['business', '法人'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={filter === id ? 'buzz-segment-active' : 'buzz-segment'}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="buzz-table-wrap overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3">種別</th>
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">オーナー</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">プラン</th>
              <th className="px-4 py-3">席数</th>
              <th className="px-4 py-3">決済</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    {row.accountType === 'business' ? (
                      <Building2 className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                    {row.accountTypeLabel}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  {row.companyName ?? '（個人）'}
                </td>
                <td className="px-4 py-3 text-neutral-600">{row.ownerEmail ?? row.ownerUid.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <span className={row.billingExempt || row.billingStatus === 'monitor' ? 'text-amber-700' : 'text-green-700'}>
                    {row.billingStatusLabel}
                    {row.billingExempt ? '（免除）' : ''}
                  </span>
                </td>
                <td className="px-4 py-3">{row.plan}</td>
                <td className="px-4 py-3">{row.seatCount} / {row.includedSeats}
                  {row.entitlements.extraSeats > 0 && (
                    <span className="ml-1 text-xs text-neutral-500">+{row.entitlements.extraSeats}席</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">
                  {row.paymentProvider ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <button type="button" className="text-xs text-violet-700 underline underline-offset-2" onClick={() => startEdit(row)}>
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">該当するアカウントがありません</p>
        )}
      </div>

      {editingId && (
        <div className="buzz-modal-overlay" onClick={() => setEditingId(null)}>
          <div className="buzz-modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="buzz-modal-header">
              <h2 className="text-lg font-bold">アカウント編集</h2>
            </div>
            <div className="buzz-modal-body space-y-4">
              <div>
                <label className="buzz-label">プラン</label>
                <select className="buzz-input" value={editPlan} onChange={(e) => setEditPlan(e.target.value)}>
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="buzz-label">課金ステータス</label>
                <select className="buzz-input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editExempt} onChange={(e) => setEditExempt(e.target.checked)} className="accent-violet-600" />
                課金免除（モニター等）
              </label>
              <div>
                <label className="buzz-label">免除理由</label>
                <input className="buzz-input" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
              </div>
            </div>
            <div className="buzz-modal-footer justify-end">
              <button type="button" className="buzz-btn-secondary" onClick={() => setEditingId(null)}>キャンセル</button>
              <button type="button" className="buzz-btn-primary" onClick={() => saveEdit()}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
