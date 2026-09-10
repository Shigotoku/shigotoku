/**
 * Enterprise: 店舗横断 KPI・テンプレ一括配信・改ざん検知（基本）
 */
import { getFirestore } from 'firebase-admin/firestore';
import { getUserSettings, getMetrics, type UserSettings } from './firestore';
import { listStoresForUser } from './stores';

export interface CrossStoreKpi {
  storeId: string;
  storeName: string;
  healthScore: number;
  lineFriends: number;
  reach: number;
  revenue: number;
  metaConnected: boolean;
  lineConnected: boolean;
  gbpConnected: boolean;
}

export async function buildCrossStoreKpis(ownerUid: string): Promise<CrossStoreKpi[]> {
  const stores = await listStoresForUser(ownerUid);
  const settings = await getUserSettings(ownerUid);
  const metrics = await getMetrics(ownerUid);

  if (stores.length === 0) {
    return [{
      storeId: 'default',
      storeName: settings.displayName ?? 'マイ店舗',
      healthScore: metrics.healthScore,
      lineFriends: metrics.funnel.lineSignups,
      reach: metrics.funnel.reach,
      revenue: metrics.funnel.revenue,
      metaConnected: !!(settings.metaAccessToken && settings.metaIgUserId),
      lineConnected: !!settings.lineChannelAccessToken,
      gbpConnected: !!settings.gbpConnected,
    }];
  }

  return stores.map((store) => ({
    storeId: store.id,
    storeName: store.name,
    healthScore: metrics.healthScore,
    lineFriends: metrics.funnel.lineSignups,
    reach: metrics.funnel.reach,
    revenue: metrics.funnel.revenue,
    metaConnected: !!(settings.metaAccessToken && settings.metaIgUserId),
    lineConnected: !!settings.lineChannelAccessToken,
    gbpConnected: !!settings.gbpConnected,
  }));
}

export async function bulkDistributeTemplate(
  ownerUid: string,
  input: { storeIds: string[]; templateTitle: string; templateBody: string; publishMode: string },
): Promise<{ jobIds: string[] }> {
  const { createScheduledJob } = await import('./firestore');
  const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const jobIds: string[] = [];

  for (const storeId of input.storeIds) {
    const jobId = await createScheduledJob(ownerUid, {
      contents: [{
        platform: 'line',
        label: `[${storeId}] ${input.templateTitle}`,
        content: input.templateBody,
      }],
      scheduledAt,
      publishMode: input.publishMode as import('../types/schedule').PublishMode,
      status: 'pending_approval',
    });
    jobIds.push(jobId);
  }

  return { jobIds };
}

export interface TamperAlert {
  id: string;
  storeId: string;
  field: string;
  detectedAt: string;
  status: 'open' | 'resolved';
  detail: string;
}

export async function listTamperAlerts(uid: string): Promise<TamperAlert[]> {
  const snap = await getFirestore()
    .collection(`users/${uid}/gbpTamperAlerts`)
    .orderBy('detectedAt', 'desc')
    .limit(20)
    .get()
    .catch(() => null);
  if (!snap || snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TamperAlert, 'id'>) }));
}

export async function recordGbpSnapshot(uid: string, settings: UserSettings): Promise<void> {
  if (!settings.gbpConnected || !settings.gbpLocationName) return;
  const db = getFirestore();
  const ref = db.collection(`users/${uid}/gbpSnapshots`).doc('latest');
  const prev = await ref.get();
  const snapshot = {
    locationName: settings.gbpLocationName,
    capturedAt: new Date().toISOString(),
  };
  if (prev.exists) {
    const old = prev.data()?.locationName as string;
    if (old && old !== settings.gbpLocationName) {
      await db.collection(`users/${uid}/gbpTamperAlerts`).add({
        storeId: settings.activeStoreId ?? 'default',
        field: 'locationName',
        detectedAt: new Date().toISOString(),
        status: 'open',
        detail: `店舗名が変更されました: "${old}" → "${settings.gbpLocationName}"`,
      });
    }
  }
  await ref.set(snapshot);
}

export async function saveEnterpriseInquiry(input: {
  uid?: string;
  company: string;
  email: string;
  storeCount: number;
  message: string;
}): Promise<string> {
  const ref = await getFirestore().collection('enterpriseInquiries').add({
    ...input,
    createdAt: new Date().toISOString(),
    status: 'new',
  });
  return ref.id;
}
