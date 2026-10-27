import { generateMissionAdvice, generateRepurposeWithGemini } from './gemini';
import {
  addPost,
  createScheduledJob,
  getMetrics,
  getSlackIdeas,
  getUserSettings,
  updateMetrics,
  type UserSettings,
} from './firestore';
import { postToSlackWebhook } from './slack';
import type { NotificationSlot } from './slack';
import { buildStrategicNotification } from './slack';
import type { PublishMode } from '../types/schedule';

function nextAutoScheduleAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return d.toISOString();
}

export async function runAutoModeForUser(uid: string): Promise<{ mission: { title: string; description: string } }> {
  const settings = await getUserSettings(uid);
  const metrics = await getMetrics(uid);
  const ideas = await getSlackIdeas(uid);
  const pendingIdea = ideas.find((i) => i.status === 'pending');
  const { getTrends } = await import('./trends');
  const trends = await getTrends(uid, 1);
  const trendIdea = trends[0] ? `${trends[0].topic} — ${trends[0].hook}` : null;

  const ideaSource = trendIdea ?? pendingIdea?.text ?? '新作メニューの春カラー施策';
  const { results } = await generateRepurposeWithGemini(ideaSource, settings.plan);

  const reels = results.find((r) => r.platform === 'reels');
  if (reels) {
    await addPost(uid, {
      title: reels.content.slice(0, 40),
      platform: 'reels',
      content: reels.content,
      reach: 0,
      revenue: 0,
    });
  }

  const publishMode: PublishMode = resolveAutoPublishMode(settings);

  await createScheduledJob(uid, {
    contents: results.map((r) => ({
      platform: r.platform,
      label: r.label,
      content: r.content,
      carouselSlides: r.carouselSlides,
    })),
    scheduledAt: nextAutoScheduleAt(),
    publishMode,
    status: publishMode === 'approval' ? 'pending_approval' : 'pending',
  });

  const mission = await generateMissionAdvice(metrics);
  await updateMetrics(uid, {
    mission: {
      title: publishMode === 'approval' ? '承認待ちの投稿があります' : mission.title,
      description:
        publishMode === 'approval'
          ? 'Auto Mode が生成した投稿案をダッシュボードから承認してください。'
          : mission.description,
    },
  });

  if (settings.slackWebhookUrl) {
    await postToSlackWebhook(
      settings.slackWebhookUrl,
      publishMode === 'approval'
        ? `🤖 *Auto Mode* が投稿案を生成しました（承認待ち）\n${ideaSource.slice(0, 120)}`
        : `🤖 *Auto Mode* が新しい投稿案を生成しました\n${mission.title}\n${mission.description}`,
    );
  }

  return { mission };
}

export async function runAutoModeForAllUsers(): Promise<number> {
  const { getAutoModeUsers } = await import('./firestore');
  const users = await getAutoModeUsers();
  let count = 0;
  for (const user of users) {
    try {
      await runAutoModeForUser(user.uid);
      count++;
    } catch (err) {
      console.error(`Auto mode failed for ${user.uid}:`, err);
    }
  }
  return count;
}

export async function sendStrategicNotifications(slot: NotificationSlot): Promise<number> {
  const { getAllUsersWithSlack, getMetrics } = await import('./firestore');
  const users = await getAllUsersWithSlack();
  let sent = 0;

  for (const user of users) {
    if (!user.slackWebhookUrl) continue;
    if (slot === 'noon' && user.plan === 'starter') continue;
    if (slot === 'evening' && !['team', 'growth'].includes(user.plan)) continue;

    const metrics = await getMetrics(user.uid);
    const text = buildStrategicNotification(slot, metrics);
    const ok = await postToSlackWebhook(user.slackWebhookUrl, text);
    if (ok) sent++;
  }

  return sent;
}

export function canUseSlack(settings: UserSettings): boolean {
  return ['team', 'growth'].includes(settings.plan);
}

export function canUseAutoMode(settings: UserSettings): boolean {
  return settings.plan === 'growth' && !!settings.autoModeEnabled;
}

/** Auto Mode の配信先をリーチ/CV 目標に応じて最適化 */
export function resolveAutoPublishMode(settings: UserSettings): PublishMode {
  if (settings.defaultPublishMode && settings.defaultPublishMode !== 'auto') {
    return settings.defaultPublishMode;
  }
  const goal = settings.autoModeGoal ?? 'reach';
  if (goal === 'cv') {
    if (settings.lineChannelAccessToken) return 'line';
    return 'approval';
  }
  if (settings.gbpConnected && settings.gbpAccessToken) return 'gbp';
  if (settings.metaAccessToken && settings.metaIgUserId) return 'meta';
  if (settings.lineChannelAccessToken) return 'line';
  return 'approval';
}
