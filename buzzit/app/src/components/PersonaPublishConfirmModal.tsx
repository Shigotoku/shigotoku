import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { usePersona } from '../store/personaContext';
import { personaSnsLinks, personaTypeLabel } from '../lib/personaSnsStatus';
import { detectJobPlatformId } from '../lib/snsPlatforms';
import type { PublishMode } from '../lib/api';
import { clientPublishModeBlocked, isAutoPublishMode } from '../lib/publishModeSafety';

export type PersonaConfirmAction = 'schedule' | 'draft' | 'approve';

type TargetRow = {
  label: string;
  connected: boolean;
};

type Props = {
  open: boolean;
  action: PersonaConfirmAction;
  publishMode?: PublishMode;
  /** 予約する媒体ラベル（例: X投稿, リール） */
  contentLabels?: string[];
  onCancel: () => void;
  onConfirm: () => void;
};

const ACTION_TITLE: Record<PersonaConfirmAction, string> = {
  schedule: '予約する前に配信キャラを確認',
  draft: '下書き保存前に配信キャラを確認',
  approve: '承認する前に配信キャラを確認',
};

function targetsForMode(
  personaLinks: ReturnType<typeof personaSnsLinks>,
  publishMode: PublishMode | undefined,
  contentLabels: string[],
): TargetRow[] {
  const byLabel = (id: string, fallback: string) => {
    const link = personaLinks.find((l) => l.id === id);
    return { label: fallback, connected: !!link?.connected };
  };

  if (publishMode === 'x_free') return [byLabel('x', 'X（自動投稿）')];
  if (publishMode === 'line') return [byLabel('line', 'LINE')];
  if (publishMode === 'gbp') return [byLabel('gbp', 'Googleビジネス')];
  if (publishMode === 'meta') {
    const rows: TargetRow[] = [byLabel('instagram', 'Instagram / Meta')];
    if (contentLabels.some((l) => /facebook|threads/i.test(l))) {
      rows.push(byLabel('instagram', 'Facebook / Threads（Meta連携）'));
    }
    return rows;
  }
  if (publishMode === 'notify' || publishMode === 'approval') {
    return contentLabels.length
      ? contentLabels.map((l) => ({ label: l, connected: true }))
      : [{ label: 'リマインダー（SNS自動投稿なし）', connected: true }];
  }

  return contentLabels.map((l) => {
    const pseudo = { contents: [{ label: l }] };
    const pid = detectJobPlatformId(pseudo);
    if (pid) {
      const link = personaLinks.find((x) => x.id === pid);
      return { label: l, connected: !!link?.connected };
    }
    return { label: l, connected: true };
  });
}

/**
 * 予約・下書き・承認の直前に、配信キャラと投稿先を明示確認する（誤キャラ防止）。
 */
export default function PersonaPublishConfirmModal({
  open,
  action,
  publishMode,
  contentLabels = [],
  onCancel,
  onConfirm,
}: Props) {
  const { activePersona } = usePersona();
  const [checked, setChecked] = useState(false);

  const links = useMemo(() => (activePersona ? personaSnsLinks(activePersona) : []), [activePersona]);
  const targets = useMemo(
    () => targetsForMode(links, publishMode, contentLabels),
    [links, publishMode, contentLabels],
  );
  const missingAuto = targets.filter(
    (t) => !t.connected && publishMode && isAutoPublishMode(publishMode),
  );
  const serverBlock = clientPublishModeBlocked(activePersona, publishMode);
  const xHandle = activePersona?.xUsername?.trim().replace(/^@/, '');

  if (!open || !activePersona) return null;

  const handleConfirm = () => {
    if (!checked) return;
    setChecked(false);
    onConfirm();
  };

  const handleCancel = () => {
    setChecked(false);
    onCancel();
  };

  return (
    <div className="buzz-modal-overlay z-[75]" role="dialog" aria-modal>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl buzz-fade-in">
        <div className="flex items-start justify-between border-b border-neutral-100 bg-amber-50 px-5 py-4">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div>
              <h3 className="text-base font-bold text-neutral-900">{ACTION_TITLE[action]}</h3>
              <p className="mt-1 text-xs text-neutral-600">別キャラの SNS に送る事故を防ぐため、毎回確認します。</p>
            </div>
          </div>
          <button type="button" onClick={handleCancel} className="rounded p-1 text-neutral-500 hover:bg-neutral-100" aria-label="閉じる">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          <div className="rounded-xl border-2 border-violet-300 bg-violet-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">配信キャラ</p>
            <p className="mt-1 text-lg font-bold text-violet-950">{activePersona.name}</p>
            <p className="text-xs text-violet-800/90">{personaTypeLabel(activePersona.type)} · このキャラの SNS 連携に投稿されます</p>
            {xHandle && (
              <p className="mt-2 rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-bold text-white">
                X 投稿先: @{xHandle}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-neutral-700">この操作で関わる投稿先</p>
            <ul className="space-y-1.5">
              {targets.map((t, i) => (
                <li
                  key={`${t.label}-${i}`}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                    t.connected ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="font-medium">{t.connected ? '連携済み' : '未連携'}</span>
                </li>
              ))}
            </ul>
          </div>

          {(missingAuto.length > 0 || serverBlock) && action !== 'draft' && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {serverBlock ?? '自動投稿先が未連携です。連携後に予約するか、通知モードに変更してください。'}
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className="text-xs leading-relaxed text-neutral-800">
              <strong>{activePersona.name}</strong> として投稿・予約することに間違いはありません
            </span>
          </label>
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={handleCancel} className="min-h-[44px] flex-1 border border-neutral-300 text-sm">
            戻る
          </button>
          <button
            type="button"
            disabled={
              !checked ||
              (action !== 'draft' &&
                !!serverBlock &&
                publishMode &&
                isAutoPublishMode(publishMode) &&
                (action === 'schedule' || action === 'approve'))
            }
            onClick={handleConfirm}
            className="buzz-btn-primary min-h-[44px] flex-1 disabled:opacity-50"
          >
            {action === 'approve' ? '承認する' : action === 'draft' ? '下書きを保存' : '予約を確定'}
          </button>
        </div>
      </div>
    </div>
  );
}
