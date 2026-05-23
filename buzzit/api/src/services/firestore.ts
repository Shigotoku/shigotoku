import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export type PlanTier = 'starter' | 'pro' | 'team' | 'growth';

export interface UserSettings {
  uid: string;
  plan: PlanTier;
  email?: string;
  displayName?: string;
  slackWebhookUrl?: string;
  ayrshareProfileKey?: string;
  autoModeEnabled?: boolean;
  industry?: string;
}

export interface MetricsSummary {
  healthScore: number;
  healthTrend: number;
  reach: number;
  saveRate: number;
  shareRate: number;
  clickRate: number;
  lineFriends: number;
  estimatedRevenue: number;
  reachRating: string;
  clickRating: string;
  funnel: {
    posts: number;
    reach: number;
    clicks: number;
    lineSignups: number;
    revenue: number;
  };
  mission: { title: string; description: string };
  updatedAt: string;
}

export interface PostRecord {
  id: string;
  title: string;
  platform: string;
  content: string;
  reach: number;
  revenue: number;
  createdAt: string;
}

export interface SlackIdea {
  id: string;
  text: string;
  author: string;
  scriptPreview: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

function db() {
  return getFirestore();
}

const DEFAULT_METRICS: MetricsSummary = {
  healthScore: 72,
  healthTrend: 4.2,
  reach: 24500,
  saveRate: 8.2,
  shareRate: 2.1,
  clickRate: 1.8,
  lineFriends: 128,
  estimatedRevenue: 286000,
  reachRating: '良好',
  clickRating: '改善余地あり',
  funnel: { posts: 12, reach: 24500, clicks: 441, lineSignups: 28, revenue: 286000 },
  mission: {
    title: '本日のリール動画を承認してください',
    description: 'AIが生成した台本を確認し、15分以内に投稿を完了しましょう。',
  },
  updatedAt: new Date().toISOString(),
};

export async function ensureUser(uid: string, email?: string, displayName?: string): Promise<UserSettings> {
  const ref = db().collection('users').doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const settings: UserSettings = {
      uid,
      plan: 'starter',
      email,
      displayName,
      autoModeEnabled: false,
      industry: 'salon',
    };
    await ref.set({ ...settings, createdAt: FieldValue.serverTimestamp() });
    await ref.collection('metrics').doc('summary').set(DEFAULT_METRICS);
    await seedDemoPosts(uid);
    return settings;
  }

  return snap.data() as UserSettings;
}

async function seedDemoPosts(uid: string) {
  const posts = [
    { title: '春カラーショート動画', platform: 'reels', reach: 12400, revenue: 128000 },
    { title: '【悲報】カラー失敗フック', platform: 'x_thread', reach: 8200, revenue: 98000 },
    { title: 'スタッフ紹介カルーセル', platform: 'carousel', reach: 3900, revenue: 56000 },
  ];
  const batch = db().batch();
  for (const p of posts) {
    const doc = db().collection('users').doc(uid).collection('posts').doc();
    batch.set(doc, {
      ...p,
      content: p.title,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function getUserSettings(uid: string): Promise<UserSettings> {
  await ensureUser(uid);
  const snap = await db().collection('users').doc(uid).get();
  return { uid, ...(snap.data() as Omit<UserSettings, 'uid'>) };
}

export async function updateUserSettings(uid: string, patch: Partial<UserSettings>): Promise<UserSettings> {
  await ensureUser(uid);
  const { uid: _, ...safe } = patch;
  await db().collection('users').doc(uid).set(
    { ...safe, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return getUserSettings(uid);
}

export async function getMetrics(uid: string): Promise<MetricsSummary> {
  await ensureUser(uid);
  const snap = await db().collection('users').doc(uid).collection('metrics').doc('summary').get();
  if (!snap.exists) return DEFAULT_METRICS;
  return snap.data() as MetricsSummary;
}

export async function updateMetrics(uid: string, patch: Partial<MetricsSummary>): Promise<MetricsSummary> {
  await ensureUser(uid);
  await db().collection('users').doc(uid).collection('metrics').doc('summary').set(
    { ...patch, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  return getMetrics(uid);
}

export async function getPosts(uid: string): Promise<PostRecord[]> {
  await ensureUser(uid);
  const snap = await db()
    .collection('users')
    .doc(uid)
    .collection('posts')
    .orderBy('revenue', 'desc')
    .limit(10)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    const created = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : new Date().toISOString();
    return {
      id: d.id,
      title: data.title as string,
      platform: data.platform as string,
      content: data.content as string,
      reach: data.reach as number,
      revenue: data.revenue as number,
      createdAt: created,
    };
  });
}

export async function addPost(
  uid: string,
  post: Omit<PostRecord, 'id' | 'createdAt'>,
): Promise<void> {
  await db().collection('users').doc(uid).collection('posts').add({
    ...post,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function saveScheduledJob(
  uid: string,
  contents: Array<{ platform: string; label: string; content: string }>,
  scheduledAt: string,
  status: string,
  ayrshareResponse?: unknown,
): Promise<string> {
  const ref = await db().collection('users').doc(uid).collection('scheduled').add({
    contents,
    scheduledAt,
    status,
    ayrshareResponse: ayrshareResponse ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function addSlackIdea(
  uid: string,
  text: string,
  author: string,
  scriptPreview: string,
): Promise<string> {
  const ref = await db().collection('users').doc(uid).collection('slackIdeas').add({
    text,
    author,
    scriptPreview,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getSlackIdeas(uid: string): Promise<SlackIdea[]> {
  const snap = await db()
    .collection('users')
    .doc(uid)
    .collection('slackIdeas')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    const created = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : new Date().toISOString();
    return {
      id: d.id,
      text: data.text as string,
      author: data.author as string,
      scriptPreview: data.scriptPreview as string,
      status: data.status as SlackIdea['status'],
      createdAt: created,
    };
  });
}

export async function approveSlackIdea(uid: string, ideaId: string): Promise<void> {
  await db().collection('users').doc(uid).collection('slackIdeas').doc(ideaId).update({
    status: 'approved',
    approvedAt: FieldValue.serverTimestamp(),
  });
}

export async function trackMetricEvent(
  uid: string,
  event: 'reach' | 'click' | 'line_signup' | 'revenue',
  value: number,
): Promise<void> {
  const metrics = await getMetrics(uid);
  const funnel = { ...metrics.funnel };

  switch (event) {
    case 'reach':
      funnel.reach += value;
      break;
    case 'click':
      funnel.clicks += value;
      break;
    case 'line_signup':
      funnel.lineSignups += value;
      break;
    case 'revenue':
      funnel.revenue += value;
      break;
  }

  await updateMetrics(uid, {
    funnel,
    reach: funnel.reach,
    lineFriends: metrics.lineFriends + (event === 'line_signup' ? value : 0),
    estimatedRevenue: funnel.revenue,
    clickRate: funnel.reach > 0 ? Math.round((funnel.clicks / funnel.reach) * 1000) / 10 : metrics.clickRate,
    healthScore: Math.min(99, metrics.healthScore + (event === 'revenue' ? 1 : 0)),
  });
}

export async function getAutoModeUsers(): Promise<UserSettings[]> {
  const snap = await db().collection('users').where('autoModeEnabled', '==', true).get();
  return snap.docs.map((d) => d.data() as UserSettings);
}

export async function getAllUsersWithSlack(): Promise<UserSettings[]> {
  const snap = await db().collection('users').get();
  return snap.docs
    .map((d) => d.data() as UserSettings)
    .filter((u) => !!u.slackWebhookUrl);
}
