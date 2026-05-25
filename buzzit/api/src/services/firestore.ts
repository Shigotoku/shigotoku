import type { PublishMode, ScheduledJobStatus, ScheduleContentItem } from '../types/schedule';
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
  slackTeamId?: string;
  /** LINE Messaging API Channel Secret（Webhook 署名検証） */
  lineChannelSecret?: string;
  /** LINE Messaging API Channel Access Token（配信・通知） */
  lineChannelAccessToken?: string;
  /** LINE 管理者ユーザーID（push 通知用・任意） */
  lineAdminUserId?: string;
  /** LINE Webhook destination（Bot ID）— ユーザー特定用 */
  lineDestinationId?: string;
  /** Meta OAuth */
  metaAccessToken?: string;
  metaPageAccessToken?: string;
  metaIgUserId?: string;
  metaPageId?: string;
  metaTokenExpiresAt?: string;
  /** 通知モード（notify / meta / line / approval / auto） */
  defaultPublishMode?: 'notify' | 'meta' | 'line' | 'approval' | 'auto';
  /** クリック計測のリダイレクト先（店舗サイト・予約ページ等） */
  defaultDestinationUrl?: string;
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
  clicks?: number;
  lineSignups?: number;
  trackingUrl?: string;
  utmCampaign?: string;
  createdAt: string;
}

export interface TrackingLinkRecord {
  token: string;
  uid: string;
  postId?: string;
  destinationUrl: string;
  utmCampaign: string;
  platform?: string;
  title?: string;
  clicks: number;
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
      autoModeEnabled: false,
      industry: 'salon',
      ...(email ? { email } : {}),
      ...(displayName ? { displayName } : {}),
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
    { title: '春カラーショート動画', platform: 'reels', reach: 12400, revenue: 128000, clicks: 186, lineSignups: 12 },
    { title: '【悲報】カラー失敗フック', platform: 'x_thread', reach: 8200, revenue: 98000, clicks: 142, lineSignups: 9 },
    { title: 'スタッフ紹介カルーセル', platform: 'carousel', reach: 3900, revenue: 56000, clicks: 58, lineSignups: 4 },
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
  const { uid: _, ...rest } = patch;
  const safe = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  );
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
      reach: (data.reach as number) ?? 0,
      revenue: (data.revenue as number) ?? 0,
      clicks: (data.clicks as number) ?? 0,
      lineSignups: (data.lineSignups as number) ?? 0,
      trackingUrl: data.trackingUrl as string | undefined,
      utmCampaign: data.utmCampaign as string | undefined,
      createdAt: created,
    };
  });
}

export async function addPost(
  uid: string,
  post: Omit<PostRecord, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await db().collection('users').doc(uid).collection('posts').add({
    clicks: 0,
    lineSignups: 0,
    ...post,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function incrementPostMetric(
  uid: string,
  postId: string,
  field: 'clicks' | 'lineSignups' | 'revenue' | 'reach',
  value = 1,
): Promise<void> {
  const ref = db().collection('users').doc(uid).collection('posts').doc(postId);
  await ref.set(
    { [field]: FieldValue.increment(value) },
    { merge: true },
  );
}

export async function createTrackingLink(
  uid: string,
  input: {
    token: string;
    postId?: string;
    destinationUrl: string;
    utmCampaign: string;
    platform?: string;
    title?: string;
  },
): Promise<void> {
  await db().collection('tracking').doc(input.token).set({
    uid,
    postId: input.postId ?? null,
    destinationUrl: input.destinationUrl,
    utmCampaign: input.utmCampaign,
    platform: input.platform ?? null,
    title: input.title ?? null,
    clicks: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (input.postId) {
    const { trackingClickUrl } = await import('./tracking');
    await db().collection('users').doc(uid).collection('posts').doc(input.postId).set(
      {
        trackingUrl: trackingClickUrl(input.token),
        utmCampaign: input.utmCampaign,
        destinationUrl: input.destinationUrl,
      },
      { merge: true },
    );
  }
}

export async function getTrackingLink(token: string): Promise<(TrackingLinkRecord & { uid: string }) | null> {
  const snap = await db().collection('tracking').doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    token: snap.id,
    uid: data.uid as string,
    postId: (data.postId as string | null) ?? undefined,
    destinationUrl: data.destinationUrl as string,
    utmCampaign: data.utmCampaign as string,
    platform: (data.platform as string | null) ?? undefined,
    title: (data.title as string | null) ?? undefined,
    clicks: (data.clicks as number) ?? 0,
    createdAt: new Date().toISOString(),
  };
}

export async function recordTrackingClick(uid: string, token: string, postId?: string): Promise<string> {
  const linkRef = db().collection('tracking').doc(token);
  const linkSnapBefore = await linkRef.get();
  const linkData = linkSnapBefore.data();
  const abTestId = linkData?.abTestId as string | undefined;
  const abVariant = linkData?.abVariant as 'A' | 'B' | undefined;

  await linkRef.set({ clicks: FieldValue.increment(1) }, { merge: true });

  if (postId) {
    await incrementPostMetric(uid, postId, 'clicks', 1);
  }
  if (abTestId && abVariant) {
    const { incrementAbVariantMetric } = await import('./abTest');
    await incrementAbVariantMetric(uid, abTestId, abVariant, 'clicks');
  }
  await trackMetricEvent(uid, 'click', 1, postId);

  const linkSnap = await linkRef.get();
  const destinationUrl = linkSnap.data()?.destinationUrl as string;
  const utmCampaign = linkSnap.data()?.utmCampaign as string;
  const platform = linkSnap.data()?.platform as string | undefined;

  const { appendUtmParams } = await import('./tracking');
  return appendUtmParams(destinationUrl, {
    campaign: utmCampaign,
    medium: platform ?? 'social',
    content: postId,
  });
}

export async function findUserByLineDestination(destination: string): Promise<string | null> {
  const snap = await db().collection('users').where('lineDestinationId', '==', destination).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function saveScheduledJob(
  uid: string,
  contents: Array<{ platform: string; label: string; content: string }>,
  scheduledAt: string,
  status: string,
  ayrshareResponse?: unknown,
): Promise<string> {
  return createScheduledJob(uid, {
    contents,
    scheduledAt,
    publishMode: 'notify',
    status: status as ScheduledJobStatus,
    ayrshareResponse,
  });
}

export interface CreateScheduledJobInput {
  contents: ScheduleContentItem[];
  scheduledAt: string;
  publishMode: PublishMode;
  status?: ScheduledJobStatus;
  mediaUrls?: string[];
  destinationUrl?: string;
  trackingLinks?: Array<{ platform: string; trackingUrl: string; postId: string }>;
  ayrshareResponse?: unknown;
}

export async function createScheduledJob(uid: string, input: CreateScheduledJobInput): Promise<string> {
  const status =
    input.status ??
    (input.publishMode === 'approval' ? 'pending_approval' : 'pending');

  const ref = await db().collection('users').doc(uid).collection('scheduled').add({
    contents: input.contents,
    scheduledAt: input.scheduledAt,
    publishMode: input.publishMode,
    status,
    mediaUrls: input.mediaUrls ?? [],
    destinationUrl: input.destinationUrl ?? null,
    trackingLinks: input.trackingLinks ?? [],
    ayrshareResponse: input.ayrshareResponse ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export interface ScheduledJobDoc {
  id: string;
  uid: string;
  contents: ScheduleContentItem[];
  scheduledAt: string;
  publishMode: PublishMode;
  status: ScheduledJobStatus;
  mediaUrls?: string[];
  destinationUrl?: string;
  trackingLinks?: Array<{ platform: string; trackingUrl: string; postId: string }>;
  errorMessage?: string;
  completedMessage?: string;
  publishResults?: Array<{ platform: string; success: boolean; message: string; externalId?: string }>;
  createdAt: string;
}

function mapScheduledDoc(uid: string, id: string, data: FirebaseFirestore.DocumentData): ScheduledJobDoc {
  const created = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : new Date().toISOString();
  return {
    id,
    uid,
    contents: data.contents as ScheduleContentItem[],
    scheduledAt: data.scheduledAt as string,
    publishMode: (data.publishMode as PublishMode) ?? 'notify',
    status: (data.status as ScheduledJobStatus) ?? 'pending',
    mediaUrls: (data.mediaUrls as string[]) ?? [],
    destinationUrl: (data.destinationUrl as string | null) ?? undefined,
    trackingLinks: (data.trackingLinks as ScheduledJobDoc['trackingLinks']) ?? [],
    errorMessage: data.errorMessage as string | undefined,
    completedMessage: data.completedMessage as string | undefined,
    publishResults: data.publishResults as ScheduledJobDoc['publishResults'],
    createdAt: created,
  };
}

export async function getScheduledJobs(
  uid: string,
  status?: ScheduledJobStatus | ScheduledJobStatus[],
): Promise<ScheduledJobDoc[]> {
  let query: FirebaseFirestore.Query = db()
    .collection('users')
    .doc(uid)
    .collection('scheduled')
    .orderBy('scheduledAt', 'desc')
    .limit(30);

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    if (statuses.length === 1) {
      query = query.where('status', '==', statuses[0]);
    }
  }

  const snap = await query.get();
  let docs = snap.docs.map((d) => mapScheduledDoc(uid, d.id, d.data()));
  if (status && Array.isArray(status) && status.length > 1) {
    docs = docs.filter((d) => status.includes(d.status));
  }
  return docs;
}

export async function approveScheduledJob(uid: string, jobId: string): Promise<ScheduledJobDoc | null> {
  const ref = db().collection('users').doc(uid).collection('scheduled').doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.status !== 'pending_approval') return null;

  await ref.update({
    status: 'pending',
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return mapScheduledDoc(uid, jobId, updated.data()!);
}

export async function updateScheduledJobStatus(
  uid: string,
  jobId: string,
  patch: {
    status: ScheduledJobStatus;
    errorMessage?: string;
    completedMessage?: string;
    publishResults?: ScheduledJobDoc['publishResults'];
  },
): Promise<void> {
  await db().collection('users').doc(uid).collection('scheduled').doc(jobId).update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function claimDueScheduledJobs(limit = 20): Promise<ScheduledJobDoc[]> {
  const now = new Date().toISOString();
  const snap = await db()
    .collectionGroup('scheduled')
    .where('status', '==', 'pending')
    .where('scheduledAt', '<=', now)
    .limit(limit)
    .get();

  const claimed: ScheduledJobDoc[] = [];

  for (const doc of snap.docs) {
    const uid = doc.ref.parent.parent?.id;
    if (!uid) continue;

    const ref = doc.ref;
    const locked = await db().runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (!fresh.exists) return false;
      if (fresh.data()?.status !== 'pending') return false;
      tx.update(ref, { status: 'processing', updatedAt: FieldValue.serverTimestamp() });
      return true;
    });

    if (locked) {
      claimed.push(mapScheduledDoc(uid, doc.id, doc.data()));
    }
  }

  return claimed;
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
  postId?: string,
): Promise<void> {
  if (postId && event === 'line_signup') {
    await incrementPostMetric(uid, postId, 'lineSignups', value);
  }

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
