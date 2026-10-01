import type { PublishMode } from '../types/schedule';
import { getUserSettings } from './firestore';
import { getEffectiveSettings } from './personaSettings';
import { getPersona } from './personas';
import { postToSlackWebhook } from './slack';
import { sendLinePush } from './lineMessaging';
import { writeAuditLog } from './productExtras';
import { describePublishTargets } from './schedulePublishSafety';

export type ApprovalNotifyOptions = {
  jobId: string;
  personaId?: string;
  publishMode: PublishMode;
  scheduledAt: string;
  contentSummary: string;
  /** 公式キャラの2人目承認待ち */
  secondApproverNeeded?: boolean;
};

export async function notifyApprovalNeeded(uid: string, opts: ApprovalNotifyOptions): Promise<void> {
  const settings = await getUserSettings(uid);
  const personaId = opts.personaId ?? settings.activePersonaId;
  const effective = personaId
    ? await getEffectiveSettings(uid, personaId)
    : await getEffectiveSettings(uid);
  const persona = personaId ? await getPersona(personaId) : null;
  const personaName = persona?.name ?? effective.activePersonaName ?? '配信キャラ';
  const personaType =
    persona?.type === 'official' ? '公式' : persona?.type === 'personal' ? '個人' : 'キャラ';

  const when = new Date(opts.scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const targets = describePublishTargets(effective, opts.publishMode, [
    { platform: 'x_thread', label: opts.contentSummary, content: '' },
  ]);
  const xHandle = effective.xUsername?.trim().replace(/^@/, '');
  const targetLine = targets.join(' · ');

  const header = opts.secondApproverNeeded
    ? '🔒 *【2人目の承認が必要】公式キャラの投稿*'
    : '✅ *承認待ちの投稿があります*';

  const lines = [
    header,
    `配信キャラ: *${personaName}*（${personaType}）`,
    xHandle ? `X アカウント: @${xHandle}` : 'X: 未連携',
    `投稿先: ${targetLine}`,
    `予約日時: ${when}`,
    `モード: ${opts.publishMode}`,
    opts.secondApproverNeeded
      ? '※ 1人目は承認済みです。*別の担当者*がもう一度承認してください（同じ人は不可）。'
      : '内容を確認し、カレンダーまたはコクピットで承認してください。',
    `👉 2人目承認: https://app.buzzit.shigotoku.com/dashboard`,
    `👉 カレンダー: https://app.buzzit.shigotoku.com/calendar`,
    `👉 スタッフ招待: https://app.buzzit.shigotoku.com/settings?tab=staff`,
    `ジョブID: ${opts.jobId}`,
  ];

  const text = lines.join('\n');
  const plain = text.replace(/\*/g, '');

  if (settings.slackWebhookUrl) await postToSlackWebhook(settings.slackWebhookUrl, text);
  if (settings.lineChannelAccessToken && settings.lineAdminUserId) {
    await sendLinePush(settings.lineChannelAccessToken, settings.lineAdminUserId, plain);
  }
  await writeAuditLog(uid, 'schedule.approval_requested', opts.contentSummary.slice(0, 120), {
    jobId: opts.jobId,
    personaName,
  });
}
