import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Loader2, Minus, Plus, Store, Users } from 'lucide-react';
import { fetchBilling, updateSettings, createStore } from '../lib/api';
import { useApp } from '../store/appContext';
import { useStore } from '../store/storeContext';
import type { PlanTier } from '../types';
import {
  ADDITIONAL_STORE_DISCOUNT,
  EXTRA_SNS_ACCOUNT_MONTHLY,
  PLAN_BASE_MONTHLY,
  PLAN_LABELS,
  additionalStorePrice,
  canAddStore,
  computeMonthlyTotal,
  formatYen,
} from '../lib/billing';
import { canManageBilling } from '../lib/permissions';

export default function StoreBillingSection() {
  const { plan, setPlan } = useApp();
  const { userRole, refreshStores } = useStore();
  const [billing, setBilling] = useState<Awaited<ReturnType<typeof fetchBilling>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStoreName, setNewStoreName] = useState('');
  const [addingStore, setAddingStore] = useState(false);
  const [savingExtra, setSavingExtra] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [extraSnsAccounts, setExtraSnsAccounts] = useState(0);

  const load = () => {
    setLoading(true);
    fetchBilling()
      .then((b) => {
        setBilling(b);
        setPlan(b.plan as PlanTier);
        setExtraSnsAccounts(b.extraSnsAccounts ?? 0);
      })
      .catch(() => setMessage('請求情報の取得に失敗しました'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const canBill = canManageBilling(userRole);
  const basePrice = PLAN_BASE_MONTHLY[plan];
  const addStorePrice = additionalStorePrice(plan);
  const canAdd = billing ? canAddStore(plan, billing.storeCount) : false;
  const storeCount = billing?.storeCount ?? 1;
  const previewTotal = computeMonthlyTotal(plan, storeCount, extraSnsAccounts);

  const handleAddStore = async () => {
    if (!newStoreName.trim()) return;
    setAddingStore(true);
    setMessage(null);
    try {
      await createStore(newStoreName.trim());
      setNewStoreName('');
      await refreshStores();
      load();
      setMessage('店舗を追加しました');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '店舗の追加に失敗しました');
    } finally {
      setAddingStore(false);
    }
  };

  const persistExtraAccounts = async (next: number) => {
    const clamped = Math.max(0, Math.min(20, next));
    setExtraSnsAccounts(clamped);
    if (!canBill) return;
    setSavingExtra(true);
    setMessage(null);
    try {
      await updateSettings({ extraSnsAccounts: clamped });
      load();
      setMessage('追加SNSアカウント枠を更新しました');
    } catch {
      setMessage('追加枠の保存に失敗しました');
    } finally {
      setSavingExtra(false);
    }
  };

  return (
    <section className="buzz-card-pad">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-neutral-700" />
        <h3 className="text-lg font-bold">店舗・請求</h3>
      </div>

      <p className="mb-4 text-sm text-neutral-600">
        料金は<strong className="font-semibold text-neutral-800">店舗単位</strong>で請求されます。
        1店舗目はプラン基本料、2店舗目以降は基本料の{Math.round(ADDITIONAL_STORE_DISCOUNT * 100)}%OFF（
        {formatYen(addStorePrice)}/月）です。各SNSの1アカウント目はプランに含み、2アカウント目以降は追加枠（
        {formatYen(EXTRA_SNS_ACCOUNT_MONTHLY)}/月・枠）です。
      </p>

      {loading && !billing ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">1店舗目（基本料）</p>
            <p className="mt-1 text-xl font-bold text-neutral-900">
              {formatYen(basePrice)}
              <span className="text-sm font-normal text-neutral-500">/月</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500">{PLAN_LABELS[plan]}</p>
          </div>
          <div className="flex items-center justify-center border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            店舗数を取得中...
          </div>
          <div className="border border-neutral-900 bg-neutral-900 p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">月額合計（目安）</p>
            <p className="mt-1 text-xl font-bold">
              {formatYen(previewTotal)}
              <span className="text-sm font-normal text-neutral-300">/月</span>
            </p>
          </div>
        </div>
      ) : (
        billing && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">1店舗目（基本料）</p>
              <p className="mt-1 text-xl font-bold text-neutral-900">
                {formatYen(basePrice)}
                <span className="text-sm font-normal text-neutral-500">/月</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">{PLAN_LABELS[plan]}</p>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">店舗数</p>
              <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-neutral-900">
                <Store className="h-5 w-5 text-neutral-500" />
                {billing.storeCount}店舗
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {billing.storeLimitLabel}
                {billing.storeCount > 1 &&
                  ` ／ 追加 ${billing.storeCount - 1}店舗 × ${formatYen(addStorePrice)}`}
              </p>
            </div>
            <div className="border border-neutral-900 bg-neutral-900 p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">月額合計（目安）</p>
              <p className="mt-1 text-xl font-bold">
                {formatYen(billing.monthlyTotal)}
                <span className="text-sm font-normal text-neutral-300">/月</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-neutral-300">
                <Users className="h-3.5 w-3.5" />
                スタッフ {billing.memberCount + billing.pendingInviteCount}人（{billing.staffLimitLabel}）
              </p>
              {billing.extraSnsAccounts > 0 && (
                <p className="mt-1 text-xs text-neutral-300">
                  SNS追加枠 {billing.extraSnsAccounts} × {formatYen(billing.extraSnsAccountPrice)}
                </p>
              )}
            </div>
          </div>
        )
      )}

      <div className="mb-5 border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">追加SNSアカウント枠</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
          Instagram公式と採用用など、同じ媒体で2つ目以降のアカウントを扱う場合に追加します（1枠 ={' '}
          {formatYen(EXTRA_SNS_ACCOUNT_MONTHLY)}/月）。
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            className="buzz-btn-secondary px-3 py-2 disabled:opacity-40"
            disabled={!canBill || savingExtra || extraSnsAccounts <= 0}
            onClick={() => persistExtraAccounts(extraSnsAccounts - 1)}
            aria-label="追加枠を減らす"
          >
            <Minus className="h-4 w-4" />
          </button>
          <p className="min-w-[4rem] text-center text-lg font-bold">{extraSnsAccounts}枠</p>
          <button
            type="button"
            className="buzz-btn-secondary px-3 py-2 disabled:opacity-40"
            disabled={!canBill || savingExtra || extraSnsAccounts >= 20}
            onClick={() => persistExtraAccounts(extraSnsAccounts + 1)}
            aria-label="追加枠を増やす"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="text-sm text-neutral-600">
            +{formatYen(extraSnsAccounts * EXTRA_SNS_ACCOUNT_MONTHLY)}/月
          </span>
        </div>
      </div>

      {message && <p className="mb-4 text-sm text-neutral-700">{message}</p>}

      {canBill && canAdd && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="新しい店舗名"
            className="buzz-input flex-1"
          />
          <button
            type="button"
            onClick={handleAddStore}
            disabled={addingStore || !newStoreName.trim()}
            className="buzz-btn-secondary whitespace-nowrap disabled:opacity-50"
          >
            {addingStore ? '追加中...' : `店舗を追加（+${formatYen(addStorePrice)}/月）`}
          </button>
        </div>
      )}

      {!canBill && (
        <div className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          プラン・店舗の変更は<strong>オーナー</strong>のみ可能です。
        </div>
      )}

      <Link to="/team" className="text-sm font-semibold text-neutral-900 underline underline-offset-2">
        スタッフ管理・招待へ →
      </Link>

      <p className="mt-4 text-xs text-neutral-400">
        ※ Stripe 連携前は管理画面からプラン変更できます。正式リリース後はここからカード管理も行えます。
      </p>
    </section>
  );
}
