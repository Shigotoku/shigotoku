import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CreditCard, UserCircle2, Users, Wallet } from 'lucide-react';
import { fetchBilling } from '../lib/api';
import { usePersona } from '../store/personaContext';
import { useStore } from '../store/storeContext';
import { useApp } from '../store/appContext';
import { PLAN_LABELS, formatYen } from '../lib/billing';
import { personaSnsLinks, personaTypeLabel } from '../lib/personaSnsStatus';
import { settingsPath } from '../lib/settingsUrls';

export type BusinessEntityType = 'corporate' | 'individual' | '';

type Props = {
  industry: string;
  onIndustryChange: (v: string) => void;
  entityType: BusinessEntityType;
  onEntityTypeChange: (v: BusinessEntityType) => void;
  officeNumber: string;
  onOfficeNumberChange: (v: string) => void;
  cardBrand?: string;
  cardLast4?: string;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
      <dt className="text-sm font-medium text-neutral-500">{label}</dt>
      <dd className="min-w-0 text-sm text-neutral-900">{children}</dd>
    </div>
  );
}

function Heading({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900">
        {icon}
        {title}
      </h3>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

/**
 * 設定 → 事業所 の先頭に出す「事業所のまとめ」。
 * ①基本情報 ②お支払い ③プランと人数 ④配信キャラとSNS連携 の順に、上から読めば全体が分かる構成。
 */
export default function BusinessOverviewSection(props: Props) {
  const { plan } = useApp();
  const { stores, activeStoreId } = useStore();
  const { personas } = usePersona();
  const [billing, setBilling] = useState<Awaited<ReturnType<typeof fetchBilling>> | null>(null);

  useEffect(() => {
    fetchBilling().then(setBilling).catch(() => {});
  }, []);

  const storeName = stores?.find((s) => s.id === activeStoreId)?.name ?? '（未設定）';
  const staffCount = billing ? billing.memberCount + billing.pendingInviteCount : null;
  const hasCard = !!props.cardLast4;

  return (
    <div className="space-y-4">
      <section className="buzz-card-pad">
        <Heading
          icon={<Building2 className="h-5 w-5 text-neutral-700" />}
          title="① 事業所の基本情報"
          hint="この事業所の「身分証」にあたる情報です。"
        />
        <dl className="divide-y divide-neutral-100">
          <Row label="事業所名">
            <span className="font-semibold">{storeName}</span>
          </Row>
          <Row label="事業所番号">
            <input
              value={props.officeNumber}
              onChange={(e) => props.onOfficeNumberChange(e.target.value)}
              placeholder="例: 0001（社内管理用の番号）"
              className="buzz-input"
            />
          </Row>
          <Row label="事業者区分">
            <div className="flex gap-2">
              {(
                [
                  ['corporate', '法人（会社）'],
                  ['individual', '個人事業主'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => props.onEntityTypeChange(v)}
                  className={`min-h-[40px] rounded-lg border px-4 text-sm ${
                    props.entityType === v
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <Row label="業種">
            <input
              value={props.industry}
              onChange={(e) => props.onIndustryChange(e.target.value)}
              placeholder="例: 美容室・髪質改善特化"
              className="buzz-input"
            />
          </Row>
        </dl>
      </section>

      <section className="buzz-card-pad">
        <Heading icon={<CreditCard className="h-5 w-5 text-neutral-700" />} title="② お支払い" />
        <dl className="divide-y divide-neutral-100">
          <Row label="登録カード">
            {hasCard ? (
              <span className="font-semibold">
                {props.cardBrand || 'カード'} **** {props.cardLast4}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  未登録
                </span>
                <span className="text-xs text-neutral-500">カード登録は決済連携の開始後にここから行えます</span>
              </span>
            )}
          </Row>
          <Row label="月額合計（目安）">
            <span className="text-lg font-bold">{billing ? formatYen(billing.monthlyTotal) : '—'}</span>
            <span className="text-xs text-neutral-500"> /月</span>
          </Row>
        </dl>
      </section>

      <section className="buzz-card-pad">
        <Heading icon={<Wallet className="h-5 w-5 text-neutral-700" />} title="③ プランと人数" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-[11px] text-neutral-500">ご利用プラン</p>
            <p className="mt-1 text-base font-bold">{PLAN_LABELS[plan]}</p>
          </div>
          <div className="border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-[11px] text-neutral-500">店舗数</p>
            <p className="mt-1 text-base font-bold">{billing ? `${billing.storeCount}店舗` : '—'}</p>
          </div>
          <div className="border border-neutral-200 bg-neutral-50 p-3">
            <p className="flex items-center gap-1 text-[11px] text-neutral-500">
              <Users className="h-3 w-3" />
              スタッフ登録数
            </p>
            <p className="mt-1 text-base font-bold">{staffCount === null ? '—' : `${staffCount}人`}</p>
            {billing && <p className="text-[10px] text-neutral-500">{billing.staffLimitLabel}</p>}
          </div>
          <div className="border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-[11px] text-neutral-500">配信キャラ数</p>
            <p className="mt-1 text-base font-bold">{personas.length}体</p>
            {billing?.personaLimitLabel && <p className="text-[10px] text-neutral-500">{billing.personaLimitLabel}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link to={settingsPath({ tab: 'plan' })} className="font-semibold underline underline-offset-2">
            プランを変更する →
          </Link>
          <Link to={settingsPath({ tab: 'staff' })} className="font-semibold underline underline-offset-2">
            スタッフを管理する →
          </Link>
        </div>
      </section>

      <section className="buzz-card-pad">
        <Heading
          icon={<UserCircle2 className="h-5 w-5 text-neutral-700" />}
          title="④ 配信キャラごとのSNS連携"
          hint="緑＝連携済み／黄＝未連携（押すと連携画面へ移動します）"
        />
        {personas.length === 0 ? (
          <p className="text-sm text-neutral-500">配信キャラがまだありません。</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {personas.map((p) => {
              const links = personaSnsLinks(p);
              return (
                <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-[11px] text-neutral-500">{personaTypeLabel(p.type)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {links.map((l) => (
                      <Link
                        key={l.id}
                        to={settingsPath({ section: l.settingsSection })}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          l.connected
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-amber-300 bg-amber-50 text-amber-950'
                        }`}
                      >
                        {l.label} {l.connected ? '連携済' : '未連携'}
                      </Link>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
