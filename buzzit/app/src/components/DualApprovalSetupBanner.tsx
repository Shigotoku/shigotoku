import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserPlus, ArrowRight } from 'lucide-react';
import { usePersona } from '../store/personaContext';
import { useStore } from '../store/storeContext';
import { fetchAccountMembers, fetchStoreMembers } from '../lib/api';
import { settingsPath } from '../lib/settingsUrls';

type Props = {
  /** ダッシュボード等で余白を抑える */
  compact?: boolean;
};

/**
 * 公式キャラの二段階承認に必要な「2人目のログイン」を促す。
 */
export default function DualApprovalSetupBanner({ compact }: Props) {
  const { personas, activePersona } = usePersona();
  const { activeStoreId } = useStore();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [staffTab, setStaffTab] = useState(true);

  const hasOfficial = personas.some((p) => p.type === 'official');

  useEffect(() => {
    let count = 0;
    let pending = 0;
    let useStaff = true;

    const load = async () => {
      try {
        const account = await fetchAccountMembers();
        if (account.accountType === 'business') {
          count = Math.max(count, account.members.length);
          pending += account.invitations.length;
          useStaff = true;
        }
      } catch {
        /* 個人・未設定アカウント */
      }
      if (activeStoreId) {
        try {
          const store = await fetchStoreMembers(activeStoreId);
          count = Math.max(count, store.members.length);
          pending += store.invitations.length;
        } catch {
          /* ignore */
        }
      }
      setMemberCount(count);
      setPendingInvites(pending);
      setStaffTab(useStaff);
    };
    void load();
  }, [activeStoreId]);

  if (!hasOfficial) return null;
  if (memberCount !== null && memberCount >= 2) {
    if (compact) return null;
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <p className="flex items-center gap-2 font-medium">
          <ShieldCheck className="h-4 w-4" />
          公式キャラの二段階承認：メンバー {memberCount} 名（別ログインで2人目承認可能）
        </p>
      </div>
    );
  }

  const inviteHref = staffTab ? settingsPath({ tab: 'staff' }) : settingsPath({ tab: 'staff' });

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        公式キャラの投稿には「2人の別担当者」承認が必要です
      </p>
      <p className="mt-2 text-xs leading-relaxed text-amber-900/90">
        いまログインしている方が1人目を承認したあと、
        <strong>別の Google アカウントでログインした担当者</strong>が2人目を承認しないと予約されません。
        {activePersona?.type === 'official' && (
          <span className="block mt-1">
            現在のキャラ「{activePersona.name}」は公式です。
          </span>
        )}
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-amber-900">
        <li>設定 → スタッフ で店長・管理者を招待（メール or 招待リンク）</li>
        <li>招待された方がリンクから参加し、BuzzIt にログイン</li>
        <li>1人目承認 → Slack/LINE 通知 → 別の方がコクピット or カレンダーで2人目承認</li>
      </ol>
      {memberCount !== null && (
        <p className="mt-2 text-xs font-medium">
          現在のログイン可能メンバー: {memberCount} 名
          {pendingInvites > 0 ? `（招待承認待ち ${pendingInvites} 件）` : ''}
        </p>
      )}
      <Link
        to={inviteHref}
        className="mt-3 inline-flex min-h-[44px] items-center gap-2 border border-amber-900 bg-amber-900 px-4 text-xs font-semibold text-white"
      >
        <UserPlus className="h-4 w-4" />
        スタッフを招待する
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
