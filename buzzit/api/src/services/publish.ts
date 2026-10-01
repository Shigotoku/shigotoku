import type { PublishMode, ScheduleContentItem } from '../types/schedule';
import {
  getXApiPostsThisMonth,
  incrementXApiPostCount,
  type UserSettings,
} from './firestore';
import { scheduleWithAyrshare } from './ayrshare';
import { publishToMeta, type MetaConnection } from './meta';
import { formatScheduleNotification, sendLineBroadcast } from './lineMessaging';
import { postToSlackWebhook } from './slack';
import {
  credentialsFromSettings,
  pickXPostText,
  postTweetWithXApi,
  X_FREE_MONTHLY_SOFT_LIMIT,
} from './xApi';
import { publishGbpLocalPost } from './gbp';

export interface PublishOutcome {
  status: 'published' | 'notified' | 'failed';
  message: string;
  results?: Array<{ platform: string; success: boolean; message: string; externalId?: string }>;
}

function metaConnectionFromSettings(settings: UserSettings): MetaConnection | null {
  if (!settings.metaAccessToken) return null;
  return {
    accessToken: settings.metaAccessToken,
    igUserId: settings.metaIgUserId,
    pageId: settings.metaPageId,
    pageAccessToken: settings.metaPageAccessToken ?? settings.metaAccessToken,
    expiresAt: settings.metaTokenExpiresAt,
  };
}

export async function executePublish(
  uid: string,
  settings: UserSettings,
  mode: PublishMode,
  contents: ScheduleContentItem[],
  scheduledAt: string,
  mediaUrls?: string[],
): Promise<PublishOutcome> {
  const effectiveMode = mode === 'auto' ? resolveAutoMode(settings) : mode;

  switch (effectiveMode) {
    case 'notify':
      return notifyUser(settings, contents, scheduledAt);

    case 'meta': {
      const conn = metaConnectionFromSettings(settings);
      if (!conn) {
        const fallback = await notifyUser(settings, contents, scheduledAt);
        return { ...fallback, message: `Meta 未連携のため通知に切替: ${fallback.message}` };
      }
      const results = await publishToMeta(conn, contents, mediaUrls);
      const anyOk = results.some((r) => r.success);
      if (anyOk) {
        return {
          status: 'published',
          message: results.map((r) => r.message).join(' / '),
          results,
        };
      }
      return { status: 'failed', message: results.map((r) => r.message).join(' / '), results };
    }

    case 'line': {
      const lineContent = contents.find((c) => c.platform === 'line') ?? contents[0];
      if (!settings.lineChannelAccessToken) {
        return { status: 'failed', message: 'LINE Channel Access Token 未設定' };
      }
      const result = await sendLineBroadcast(settings.lineChannelAccessToken, lineContent.content);
      return {
        status: result.success ? 'published' : 'failed',
        message: result.message,
        results: [{ platform: 'line', success: result.success, message: result.message }],
      };
    }

    case 'ayrshare': {
      if (!process.env.AYRSHARE_API_KEY) {
        return notifyUser(settings, contents, scheduledAt);
      }
      try {
        const result = await scheduleWithAyrshare(contents, scheduledAt, settings.ayrshareProfileKey);
        return { status: 'published', message: result.message };
      } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Ayrshare failed' };
      }
    }

    case 'x_free': {
      const creds = credentialsFromSettings(settings);
      if (!creds) {
        const fallback = await notifyUser(settings, contents, scheduledAt);
        return {
          ...fallback,
          message: `X API未設定のため通知に切替: ${fallback.message}`,
        };
      }
      const used = getXApiPostsThisMonth(settings);
      if (used >= X_FREE_MONTHLY_SOFT_LIMIT) {
        return {
          status: 'failed',
          message: `今月のX投稿上限（${X_FREE_MONTHLY_SOFT_LIMIT}件）に達しています。開発者コンソールの枠・課金を確認してください`,
        };
      }
      const text = pickXPostText(contents);
      const result = await postTweetWithXApi(creds, text, mediaUrls);
      if (result.success) {
        const count = await incrementXApiPostCount(uid);
        return {
          status: 'published',
          message: `${result.message}（今月 ${count}/${X_FREE_MONTHLY_SOFT_LIMIT}）`,
          results: [
            {
              platform: 'x_thread',
              success: true,
              message: result.message,
              externalId: result.tweetId,
            },
          ],
        };
      }
      return {
        status: 'failed',
        message: result.message,
        results: [{ platform: 'x_thread', success: false, message: result.message }],
      };
    }

    case 'gbp': {
      if (!settings.gbpConnected) {
        return {
          status: 'failed',
          message: 'GBP未連携です。設定で OAuth 連携を行ってください',
        };
      }
      const gbpContent = contents.find((c) => c.platform === 'gbp') ?? contents[0];
      const mediaUrl = mediaUrls?.[0];
      const result = await publishGbpLocalPost(settings, gbpContent.content, mediaUrl);
      if (result.success) {
        return {
          status: 'published',
          message: result.message,
          results: [{ platform: 'gbp', success: true, message: result.message, externalId: result.postId }],
        };
      }
      const notified = await notifyUser(settings, contents, scheduledAt);
      return {
        status: notified.status === 'notified' ? 'notified' : 'failed',
        message: `${result.message}。通知にフォールバック: ${notified.message}`,
        results: [{ platform: 'gbp', success: false, message: result.message }],
      };
    }

    default:
      return notifyUser(settings, contents, scheduledAt);
  }
}

function resolveAutoMode(settings: UserSettings): PublishMode {
  const goal = settings.autoModeGoal ?? 'reach';
  if (goal === 'cv') {
    if (settings.lineChannelAccessToken) return 'line';
    if (settings.metaAccessToken && settings.metaIgUserId) return 'meta';
  } else {
    if (settings.gbpConnected && settings.gbpAccessToken) return 'gbp';
    if (settings.metaAccessToken && settings.metaIgUserId) return 'meta';
    if (settings.lineChannelAccessToken) return 'line';
  }
  if (credentialsFromSettings(settings)) return 'x_free';
  if (process.env.AYRSHARE_API_KEY && settings.ayrshareProfileKey) return 'ayrshare';
  return 'notify';
}

async function notifyUser(
  settings: UserSettings,
  contents: ScheduleContentItem[],
  scheduledAt: string,
): Promise<PublishOutcome> {
  const text = formatScheduleNotification(contents, scheduledAt);
  const sent: string[] = [];

  if (settings.slackWebhookUrl) {
    const ok = await postToSlackWebhook(settings.slackWebhookUrl, text);
    if (ok) sent.push('Slack');
  }

  if (settings.lineChannelAccessToken) {
    const lineResult = await sendLineBroadcast(settings.lineChannelAccessToken, text);
    if (lineResult.success) sent.push('LINE');
  }

  if (sent.length === 0) {
    return {
      status: 'notified',
      message: '通知チャネル未設定（Slack Webhook または LINE Token を設定してください）。ジョブは完了扱いです。',
    };
  }

  return {
    status: 'notified',
    message: `${sent.join('・')} に投稿文案を通知しました`,
  };
}
