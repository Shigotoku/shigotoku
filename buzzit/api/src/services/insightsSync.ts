/**
 * 投稿インサイト同期（予約ジョブの publishResults.externalId を起点）
 */
import {
  getScheduledJobs,
  upsertPostInsight,
  listPostInsights,
  getPostInsight,
  type UserSettings,
  type PostInsightDoc,
} from './firestore';
import { getEffectiveSettings } from './personaSettings';
import { updatePersona } from './personas';
import {
  fetchInstagramMediaInsights,
  fetchXTweetMetrics,
  fetchFacebookPostInsights,
  fetchThreadsPostInsights,
  normalizeInsightPlatform,
  type FetchedInsight,
} from './insights';
import { credentialsFromSettings } from './xApi';
import type { MetaConnection } from './meta';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';

const STALE_MS = 6 * 60 * 60 * 1000; // 6時間以内はスキップ（force 以外）

function metaFromSettings(settings: UserSettings): MetaConnection | null {
  if (!settings.metaAccessToken) return null;
  return {
    accessToken: settings.metaAccessToken,
    igUserId: settings.metaIgUserId,
    pageId: settings.metaPageId,
    pageAccessToken: settings.metaPageAccessToken ?? settings.metaAccessToken,
    expiresAt: settings.metaTokenExpiresAt,
  };
}

function insightDocId(jobId: string, platform: string, externalId: string): string {
  return `${jobId}_${platform}_${externalId}`.replace(/[/\\#?[\]]/g, '_').slice(0, 700);
}

function previewFromJob(contents: Array<{ content?: string }>): string {
  const text = contents[0]?.content ?? '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 80);
}

export interface SyncInsightsResult {
  scanned: number;
  fetched: number;
  skipped: number;
  errors: number;
  xSkippedCostGate: number;
  messages: string[];
}

export async function syncInsightsForUser(
  uid: string,
  options: { force?: boolean } = {},
): Promise<SyncInsightsResult> {
  const settings = await getEffectiveSettings(uid);
  const insightsOn = settings.insightsEnabled !== false;
  const xOn = settings.xInsightsEnabled === true;

  const result: SyncInsightsResult = {
    scanned: 0,
    fetched: 0,
    skipped: 0,
    errors: 0,
    xSkippedCostGate: 0,
    messages: [],
  };

  if (!insightsOn) {
    result.messages.push('インサイト同期がオフです（設定で有効化）');
    return result;
  }

  const jobs = await getScheduledJobs(uid, 'published');
  const meta = metaFromSettings(settings);
  const xCreds = credentialsFromSettings(settings);
  const now = Date.now();

  for (const job of jobs.slice(0, 80)) {
    const results = job.publishResults ?? [];
    for (const pr of results) {
      if (!pr.success || !pr.externalId) continue;
      const platform = normalizeInsightPlatform(pr.platform);
      if (!platform) continue;

      result.scanned += 1;
      const id = insightDocId(job.id, platform, pr.externalId);

      if (!options.force) {
        const existing = await getPostInsight(uid, id);
        if (existing?.fetchedAt) {
          const age = now - new Date(existing.fetchedAt).getTime();
          if (Number.isFinite(age) && age < STALE_MS && !existing.lastError) {
            result.skipped += 1;
            continue;
          }
        }
      }

      if (platform === 'x' && !xOn) {
        result.xSkippedCostGate += 1;
        result.skipped += 1;
        continue;
      }

      let fetched: FetchedInsight | { error: string };
      if (platform === 'instagram') {
        if (!meta) {
          result.errors += 1;
          result.messages.push('Meta 未連携のため Instagram をスキップ');
          continue;
        }
        fetched = await fetchInstagramMediaInsights(pr.externalId, meta);
      } else if (platform === 'facebook') {
        const pageToken = meta?.pageAccessToken ?? meta?.accessToken;
        if (!pageToken) {
          result.errors += 1;
          result.messages.push('Meta Page 未連携のため Facebook をスキップ');
          continue;
        }
        fetched = await fetchFacebookPostInsights(pr.externalId, pageToken);
      } else if (platform === 'threads') {
        const token = meta?.pageAccessToken ?? meta?.accessToken;
        if (!token) {
          result.errors += 1;
          result.messages.push('Meta 未連携のため Threads をスキップ');
          continue;
        }
        fetched = await fetchThreadsPostInsights(pr.externalId, token);
      } else {
        if (!xCreds) {
          result.errors += 1;
          continue;
        }
        fetched = await fetchXTweetMetrics(pr.externalId, xCreds);
      }

      if ('error' in fetched) {
        result.errors += 1;
        await upsertPostInsight(uid, {
          id,
          jobId: job.id,
          platform,
          externalId: pr.externalId,
          impressions: 0,
          fetchedAt: new Date().toISOString(),
          source: platform === 'x' ? 'x' : 'meta',
          lastError: fetched.error,
          scheduledAt: job.scheduledAt,
          preview: previewFromJob(job.contents),
          personaId: job.personaId,
        });
        continue;
      }

      await upsertPostInsight(uid, {
        id,
        jobId: job.id,
        platform: fetched.platform,
        externalId: fetched.externalId,
        impressions: fetched.impressions,
        reach: fetched.reach,
        likes: fetched.likes,
        comments: fetched.comments,
        replies: fetched.replies,
        reposts: fetched.reposts,
        quotes: fetched.quotes,
        bookmarks: fetched.bookmarks,
        saved: fetched.saved,
        fetchedAt: new Date().toISOString(),
        source: platform === 'x' ? 'x' : 'meta',
        lastError: '',
        scheduledAt: job.scheduledAt,
        preview: previewFromJob(job.contents),
        personaId: job.personaId,
      });
      result.fetched += 1;
    }
  }

  await updatePersona(settings.activePersonaId, uid, {
    insightsLastSyncedAt: new Date().toISOString(),
  });

  if (result.xSkippedCostGate > 0) {
    result.messages.push(
      `X インサイト ${result.xSkippedCostGate} 件は費用ガードによりスキップ（設定で「Xインサイト取得」をオン）`,
    );
  }

  return result;
}

/**
 * 全ユーザーを一定人数ずつ順番に同期する(カーソル方式)。
 * 1回あたりの読み取り・処理時間を一定に保ち、ユーザーが1万人になっても1回の実行が重くならない。
 */
export async function syncInsightsForEligibleUsers(batchSize = 150): Promise<{
  users: number;
  fetched: number;
  errors: number;
}> {
  const db = getFirestore();
  const cursorRef = db.doc('systemState/insightsSync');
  const last = ((await cursorRef.get()).data()?.lastUid as string | undefined) ?? undefined;
  let q = db.collection('users').orderBy(FieldPath.documentId()).limit(batchSize);
  if (last) q = q.startAfter(last);
  const snap = await q.get();
  // 末尾まで届いたら次回は先頭から
  await cursorRef.set({ lastUid: snap.size < batchSize ? '' : snap.docs[snap.size - 1].id, at: new Date().toISOString() }).catch(() => undefined);

  const uids = snap.docs.filter((d) => d.data().insightsEnabled !== false).map((d) => d.id);

  let fetched = 0;
  let errors = 0;
  let users = 0;
  const CONCURRENCY = 5;
  for (let i = 0; i < uids.length; i += CONCURRENCY) {
    await Promise.all(
      uids.slice(i, i + CONCURRENCY).map(async (uid) => {
        try {
          const settings = await getEffectiveSettings(uid);
          if (settings.insightsEnabled === false) return;
          const r = await syncInsightsForUser(uid, { force: false });
          users += 1;
          fetched += r.fetched;
          errors += r.errors;
        } catch (err) {
          errors += 1;
          console.error('insights sync user failed', uid, err);
        }
      }),
    );
  }

  return { users, fetched, errors };
}

export interface InsightsSummary {
  totalImpressions: number;
  totalReach: number;
  postCount: number;
  byPlatform: Record<
    string,
    { impressions: number; reach: number; postCount: number }
  >;
  lastSyncedAt?: string;
  insightsEnabled: boolean;
  xInsightsEnabled: boolean;
  /** 費用まわりの表示用（課金実装前の土台） */
  xInsightsBillingNote: string;
  recent: PostInsightDoc[];
}

export async function buildInsightsSummary(
  uid: string,
  platform?: string,
): Promise<InsightsSummary> {
  const settings = await getEffectiveSettings(uid);
  const all = await listPostInsights(uid, { limit: 200 });
  const filtered = platform
    ? all.filter((p) => {
        const want = platform.toLowerCase();
        if (want === 'instagram') return p.platform === 'instagram';
        if (want === 'x') return p.platform === 'x';
        if (want === 'facebook-threads') return p.platform === 'threads' || p.platform === 'facebook';
        return p.platform === want;
      })
    : all;

  const byPlatform: InsightsSummary['byPlatform'] = {};
  let totalImpressions = 0;
  let totalReach = 0;

  for (const row of filtered) {
    if (row.lastError) continue;
    totalImpressions += row.impressions || 0;
    totalReach += row.reach || 0;
    const key = row.platform;
    if (!byPlatform[key]) byPlatform[key] = { impressions: 0, reach: 0, postCount: 0 };
    byPlatform[key].impressions += row.impressions || 0;
    byPlatform[key].reach += row.reach || 0;
    byPlatform[key].postCount += 1;
  }

  return {
    totalImpressions,
    totalReach,
    postCount: filtered.filter((r) => !r.lastError).length,
    byPlatform,
    lastSyncedAt: settings.insightsLastSyncedAt,
    insightsEnabled: settings.insightsEnabled !== false,
    xInsightsEnabled: settings.xInsightsEnabled === true,
    xInsightsBillingNote:
      'X のインプレッション取得は API 読み取り従量の対象になる場合があります。追加費用プランにするか検討中のため、既定ではオフです。',
    recent: filtered.slice(0, 20),
  };
}
