import { generateMissionAdvice, generateRepurposeWithGemini } from './gemini';
import {
  addPost,
  getMetrics,
  getSlackIdeas,
  getUserSettings,
  updateMetrics,
  type UserSettings,
} from './firestore';
import { postToSlackWebhook } from './slack';
import type { NotificationSlot } from './slack';
import { buildStrategicNotification } from './slack';

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

  const mission = await generateMissionAdvice(metrics);
  await updateMetrics(uid, { mission });

  if (settings.slackWebhookUrl) {
    await postToSlackWebhook(
      settings.slackWebhookUrl,
      `🤖 *Auto Mode* が新しい投稿案を生成しました\n${mission.title}\n${mission.description}`,
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
