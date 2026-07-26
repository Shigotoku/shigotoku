/**
 * LINE CRM（Lステップ代替）— 友だち台帳・流入経路・セグメント・ステップ配信
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getUserSettings } from './firestore';
import {
  createLineAudienceGroup,
  createLineRichMenu,
  getLineProfile,
  sendLineMulticast,
  sendLineNarrowcast,
  sendLinePush,
  setDefaultRichMenu,
  uploadRichMenuImage,
} from './lineMessaging';

export type LineFriendStatus = 'followed' | 'blocked';

export interface LineFriend {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  language?: string;
  status: LineFriendStatus;
  followedAt: string;
  unfollowedAt?: string | null;
  lastSeenAt: string;
  tags: string[];
  sourceId?: string | null;
  score: number;
  attributes: Record<string, string>;
}

export type SegmentCondition = {
  field: 'tag' | 'source' | 'score' | 'status';
  op: 'in' | 'eq' | 'gt' | 'lt' | 'not_in';
  value: string | number | string[];
};

export type LineStepMessage = {
  delayMinutes: number;
  text: string;
};

export type LineStepTrigger = {
  kind: 'follow' | 'tag_added' | 'manual';
  tagId?: string;
};

export interface LineStepDoc {
  name: string;
  status: 'active' | 'paused';
  segmentId?: string | null;
  messages: LineStepMessage[];
  triggers: LineStepTrigger[];
  createdAt: string;
}

export interface LineStepProgress {
  uid: string;
  stepId: string;
  lineUserId: string;
  currentMessageIndex: number;
  nextSendAt: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

function db() {
  return getFirestore();
}

function friendsCol(uid: string) {
  return db().collection(`users/${uid}/lineFriends`);
}

function sourcesCol(uid: string) {
  return db().collection(`users/${uid}/lineSources`);
}

function stepsCol(uid: string) {
  return db().collection(`users/${uid}/lineSteps`);
}

function progressCol(uid: string) {
  return db().collection(`users/${uid}/lineStepProgress`);
}

function tagsCol(uid: string) {
  return db().collection(`users/${uid}/lineTags`);
}

function deliveriesCol(uid: string) {
  return db().collection(`users/${uid}/lineDeliveries`);
}

function clicksCol(uid: string) {
  return db().collection(`users/${uid}/lineSourceClicks`);
}

export async function listLineFriends(
  uid: string,
  opts?: { tag?: string; sourceId?: string; status?: LineFriendStatus; q?: string; limit?: number },
): Promise<LineFriend[]> {
  const snap = await friendsCol(uid).orderBy('lastSeenAt', 'desc').limit(opts?.limit ?? 200).get();
  let friends = snap.docs.map((d) => d.data() as LineFriend);
  if (opts?.status) friends = friends.filter((f) => f.status === opts.status);
  if (opts?.tag) friends = friends.filter((f) => f.tags.includes(opts.tag!));
  if (opts?.sourceId) friends = friends.filter((f) => f.sourceId === opts.sourceId);
  if (opts?.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    friends = friends.filter(
      (f) => f.displayName.toLowerCase().includes(q) || f.lineUserId.toLowerCase().includes(q),
    );
  }
  return friends;
}

export function friendMatchesConditions(friend: LineFriend, conditions: SegmentCondition[]): boolean {
  if (!conditions.length) return friend.status === 'followed';
  return conditions.every((c) => {
    if (c.field === 'tag') {
      const tags = Array.isArray(c.value) ? c.value.map(String) : [String(c.value)];
      if (c.op === 'in') return tags.some((t) => friend.tags.includes(t));
      if (c.op === 'not_in') return tags.every((t) => !friend.tags.includes(t));
      if (c.op === 'eq') return friend.tags.includes(String(c.value));
    }
    if (c.field === 'source') {
      if (c.op === 'eq') return friend.sourceId === String(c.value);
      if (c.op === 'in') {
        const vals = Array.isArray(c.value) ? c.value.map(String) : [String(c.value)];
        return !!friend.sourceId && vals.includes(friend.sourceId);
      }
    }
    if (c.field === 'score') {
      const n = Number(c.value);
      if (c.op === 'gt') return friend.score > n;
      if (c.op === 'lt') return friend.score < n;
      if (c.op === 'eq') return friend.score === n;
    }
    if (c.field === 'status') {
      return friend.status === String(c.value);
    }
    return false;
  });
}

export async function queryFriendsBySegment(
  uid: string,
  conditions: SegmentCondition[],
): Promise<LineFriend[]> {
  const friends = await listLineFriends(uid, { status: 'followed', limit: 5000 });
  return friends.filter((f) => friendMatchesConditions(f, conditions));
}

export async function estimateSegmentReach(
  uid: string,
  conditions: SegmentCondition[],
): Promise<number> {
  const matched = await queryFriendsBySegment(uid, conditions);
  return matched.length;
}

export async function recordSourceClick(uid: string, sourceId: string): Promise<void> {
  const now = new Date().toISOString();
  await clicksCol(uid).add({
    sourceId,
    clickedAt: now,
    consumed: false,
  });
  const sourceRef = sourcesCol(uid).doc(sourceId);
  const snap = await sourceRef.get();
  if (snap.exists) {
    await sourceRef.update({ clickCount: FieldValue.increment(1), lastClickAt: now });
  }
}

/** 直近未消費クリックを流入経路に紐づける（店舗規模向けヒューリスティック） */
export async function resolveSourceForFollow(uid: string): Promise<string | null> {
  const since = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  const snap = await clicksCol(uid)
    .where('consumed', '==', false)
    .where('clickedAt', '>=', since)
    .orderBy('clickedAt', 'desc')
    .limit(5)
    .get()
    .catch(async () => {
      // インデックス未作成時のフォールバック
      const all = await clicksCol(uid).where('consumed', '==', false).limit(50).get();
      return {
        docs: all.docs
          .filter((d) => (d.data().clickedAt as string) >= since)
          .sort((a, b) => String(b.data().clickedAt).localeCompare(String(a.data().clickedAt)))
          .slice(0, 5),
      };
    });

  const doc = snap.docs[0];
  if (!doc) return null;
  await doc.ref.update({ consumed: true, consumedAt: new Date().toISOString() });
  return String(doc.data().sourceId ?? '') || null;
}

export async function upsertLineFriendOnFollow(
  uid: string,
  lineUserId: string,
  profile?: { displayName?: string; pictureUrl?: string; language?: string },
  sourceId?: string | null,
): Promise<LineFriend> {
  const ref = friendsCol(uid).doc(lineUserId);
  const existing = await ref.get();
  const now = new Date().toISOString();
  const resolvedSource = sourceId ?? (await resolveSourceForFollow(uid));

  if (existing.exists) {
    const prev = existing.data() as LineFriend;
    const next: LineFriend = {
      ...prev,
      displayName: profile?.displayName ?? prev.displayName,
      pictureUrl: profile?.pictureUrl ?? prev.pictureUrl,
      language: profile?.language ?? prev.language,
      status: 'followed',
      unfollowedAt: null,
      lastSeenAt: now,
      sourceId: prev.sourceId ?? resolvedSource,
      score: Math.max(0, (prev.score ?? 0) + 1),
    };
    await ref.set(next, { merge: true });
    if (resolvedSource && !prev.sourceId) {
      await bumpSourceFollow(uid, resolvedSource);
    }
    return next;
  }

  const friend: LineFriend = {
    lineUserId,
    displayName: profile?.displayName ?? 'LINEユーザー',
    pictureUrl: profile?.pictureUrl,
    language: profile?.language,
    status: 'followed',
    followedAt: now,
    unfollowedAt: null,
    lastSeenAt: now,
    tags: [],
    sourceId: resolvedSource,
    score: 1,
    attributes: {},
  };
  await ref.set(friend);
  if (resolvedSource) await bumpSourceFollow(uid, resolvedSource);

  // 自動タグ: follow ルール
  await applyAutoTags(uid, lineUserId, 'follow');

  return friend;
}

async function bumpSourceFollow(uid: string, sourceId: string) {
  const ref = sourcesCol(uid).doc(sourceId);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update({ followsCount: FieldValue.increment(1) });
  }
}

export async function markLineFriendUnfollowed(uid: string, lineUserId: string): Promise<void> {
  const ref = friendsCol(uid).doc(lineUserId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const friend = snap.data() as LineFriend;
  const now = new Date().toISOString();
  await ref.update({
    status: 'blocked',
    unfollowedAt: now,
    lastSeenAt: now,
  });
  if (friend.sourceId) {
    const sref = sourcesCol(uid).doc(friend.sourceId);
    if ((await sref.get()).exists) {
      await sref.update({ blocksCount: FieldValue.increment(1) });
    }
  }
  // 進行中ステップを停止
  const prog = await progressCol(uid)
    .where('lineUserId', '==', lineUserId)
    .where('status', '==', 'pending')
    .get();
  const batch = db().batch();
  for (const d of prog.docs) {
    batch.update(d.ref, { status: 'cancelled', updatedAt: now });
  }
  await batch.commit();
}

export async function setFriendTags(
  uid: string,
  lineUserId: string,
  tags: string[],
): Promise<LineFriend | null> {
  const ref = friendsCol(uid).doc(lineUserId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const prev = snap.data() as LineFriend;
  const nextTags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  const added = nextTags.filter((t) => !prev.tags.includes(t));
  await ref.update({ tags: nextTags, lastSeenAt: new Date().toISOString() });

  // タグ人数の再集計（簡易）
  await recountTagFriendCounts(uid);

  for (const tag of added) {
    await enrollStepsForTag(uid, lineUserId, tag);
  }

  return { ...prev, tags: nextTags };
}

async function recountTagFriendCounts(uid: string) {
  const [tagsSnap, friendsSnap] = await Promise.all([
    tagsCol(uid).get(),
    friendsCol(uid).where('status', '==', 'followed').get(),
  ]);
  const friends = friendsSnap.docs.map((d) => d.data() as LineFriend);
  const batch = db().batch();
  for (const t of tagsSnap.docs) {
    const name = String(t.data().name ?? '');
    const count = friends.filter((f) => f.tags.includes(name)).length;
    batch.update(t.ref, { friendCount: count });
  }
  await batch.commit();
}

export async function applyAutoTags(
  uid: string,
  lineUserId: string,
  event: 'follow' | 'postback',
  match?: string,
): Promise<void> {
  const snap = await tagsCol(uid).where('ruleType', '==', 'auto').get();
  const toAdd: string[] = [];
  for (const d of snap.docs) {
    const data = d.data() as {
      name: string;
      autoRule?: { event?: string; match?: string };
    };
    if (data.autoRule?.event !== event) continue;
    if (data.autoRule.match && match && data.autoRule.match !== match) continue;
    if (data.autoRule.match && !match) continue;
    toAdd.push(data.name);
  }
  if (!toAdd.length) return;
  const ref = friendsCol(uid).doc(lineUserId);
  const friendSnap = await ref.get();
  if (!friendSnap.exists) return;
  const friend = friendSnap.data() as LineFriend;
  const tags = [...new Set([...friend.tags, ...toAdd])];
  await ref.update({ tags });
  await recountTagFriendCounts(uid);
}

export async function handlePostbackTag(
  uid: string,
  lineUserId: string,
  data: string,
): Promise<void> {
  // data 例: tag=VIP / action=tag&name=春カラー
  const params = new URLSearchParams(data.includes('=') ? data : `raw=${data}`);
  const tagName = params.get('tag') ?? params.get('name');
  if (tagName) {
    const ref = friendsCol(uid).doc(lineUserId);
    const snap = await ref.get();
    if (snap.exists) {
      const friend = snap.data() as LineFriend;
      const tags = [...new Set([...friend.tags, tagName])];
      await ref.update({ tags, lastSeenAt: new Date().toISOString(), score: FieldValue.increment(2) });
      await recountTagFriendCounts(uid);
      await enrollStepsForTag(uid, lineUserId, tagName);
    }
  }
  await applyAutoTags(uid, lineUserId, 'postback', tagName ?? data);
}

export async function enrollInFollowSteps(uid: string, lineUserId: string): Promise<number> {
  const snap = await stepsCol(uid).where('status', '==', 'active').get();
  let enrolled = 0;
  for (const d of snap.docs) {
    const step = d.data() as LineStepDoc;
    const triggers = step.triggers ?? [];
    if (!triggers.some((t) => t.kind === 'follow')) continue;
    const ok = await enrollStep(uid, d.id, step, lineUserId);
    if (ok) enrolled++;
  }
  return enrolled;
}

async function enrollStepsForTag(uid: string, lineUserId: string, tagName: string) {
  const snap = await stepsCol(uid).where('status', '==', 'active').get();
  for (const d of snap.docs) {
    const step = d.data() as LineStepDoc;
    const triggers = step.triggers ?? [];
    if (!triggers.some((t) => t.kind === 'tag_added' && (!t.tagId || t.tagId === tagName))) continue;
    await enrollStep(uid, d.id, step, lineUserId);
  }
}

async function enrollStep(
  uid: string,
  stepId: string,
  step: LineStepDoc,
  lineUserId: string,
): Promise<boolean> {
  if (!step.messages?.length) return false;
  const progressId = `${lineUserId}_${stepId}`;
  const ref = progressCol(uid).doc(progressId);
  const existing = await ref.get();
  if (existing.exists && (existing.data() as LineStepProgress).status === 'pending') {
    return false;
  }
  const delay = Number(step.messages[0]?.delayMinutes ?? 0);
  const nextSendAt = new Date(Date.now() + Math.max(0, delay) * 60_000).toISOString();
  const now = new Date().toISOString();
  const progress: LineStepProgress = {
    uid,
    stepId,
    lineUserId,
    currentMessageIndex: 0,
    nextSendAt,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(progress);
  return true;
}

export async function enrollManualStep(
  uid: string,
  stepId: string,
  lineUserId: string,
): Promise<boolean> {
  const snap = await stepsCol(uid).doc(stepId).get();
  if (!snap.exists) return false;
  return enrollStep(uid, stepId, snap.data() as LineStepDoc, lineUserId);
}

export async function processDueStepProgress(): Promise<{ processed: number; errors: number }> {
  const now = new Date().toISOString();
  let snap;
  try {
    snap = await db()
      .collectionGroup('lineStepProgress')
      .where('status', '==', 'pending')
      .where('nextSendAt', '<=', now)
      .limit(40)
      .get();
  } catch {
    // インデックス未準備時はスキップ
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const progress = doc.data() as LineStepProgress;
    try {
      const settings = await getUserSettings(progress.uid);
      if (!settings.lineChannelAccessToken) {
        await doc.ref.update({ status: 'cancelled', updatedAt: now, error: 'token missing' });
        errors++;
        continue;
      }
      const stepSnap = await stepsCol(progress.uid).doc(progress.stepId).get();
      if (!stepSnap.exists) {
        await doc.ref.update({ status: 'cancelled', updatedAt: now });
        continue;
      }
      const step = stepSnap.data() as LineStepDoc;
      if (step.status !== 'active') {
        await doc.ref.update({ status: 'cancelled', updatedAt: now });
        continue;
      }
      const msg = step.messages[progress.currentMessageIndex] as LineStepMessage & {
        message?: { text?: string };
      };
      const text = String(msg?.text ?? msg?.message?.text ?? '').trim();
      if (!text) {
        await doc.ref.update({ status: 'completed', updatedAt: now });
        processed++;
        continue;
      }

      const result = await sendLinePush(
        settings.lineChannelAccessToken,
        progress.lineUserId,
        text,
      );
      if (!result.success) {
        errors++;
        await doc.ref.update({
          updatedAt: new Date().toISOString(),
          lastError: result.message,
        });
        continue;
      }

      const nextIndex = progress.currentMessageIndex + 1;
      if (nextIndex >= step.messages.length) {
        await doc.ref.update({
          status: 'completed',
          currentMessageIndex: nextIndex,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const delay = Number(step.messages[nextIndex]?.delayMinutes ?? 0);
        await doc.ref.update({
          currentMessageIndex: nextIndex,
          nextSendAt: new Date(Date.now() + Math.max(0, delay) * 60_000).toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      processed++;
    } catch (err) {
      errors++;
      await doc.ref.update({
        updatedAt: new Date().toISOString(),
        lastError: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return { processed, errors };
}

export async function sendSegmentMessage(
  uid: string,
  opts: { segmentId?: string; conditions?: SegmentCondition[]; text: string },
): Promise<{ success: boolean; message: string; recipients: number; mode?: string; requestId?: string }> {
  const settings = await getUserSettings(uid);
  if (!settings.lineChannelAccessToken) {
    return { success: false, message: 'LINE Channel Access Token 未設定', recipients: 0 };
  }

  let conditions = opts.conditions ?? [];
  if (opts.segmentId) {
    const seg = await db().doc(`users/${uid}/lineSegments/${opts.segmentId}`).get();
    if (!seg.exists) return { success: false, message: 'セグメントが見つかりません', recipients: 0 };
    conditions = (seg.data()?.conditions ?? []) as SegmentCondition[];
  }

  const friends = await queryFriendsBySegment(uid, conditions);
  const userIds = friends.map((f) => f.lineUserId);
  if (!userIds.length) {
    return { success: false, message: '配信対象が0件です', recipients: 0 };
  }

  let result: { success: boolean; message: string; requestId?: string };
  let mode: string;

  if (userIds.length < 100) {
    // Narrowcast 最小100制約を回避
    result = await sendLineMulticast(settings.lineChannelAccessToken, userIds, opts.text);
    mode = 'multicast';
  } else {
    const ag = await createLineAudienceGroup(
      settings.lineChannelAccessToken,
      `buzzit_${opts.segmentId ?? 'seg'}_${Date.now()}`,
      userIds,
    );
    if (!ag.success || !ag.audienceGroupId) {
      return { success: false, message: ag.message, recipients: userIds.length };
    }
    result = await sendLineNarrowcast(
      settings.lineChannelAccessToken,
      ag.audienceGroupId,
      opts.text,
    );
    mode = 'narrowcast';
  }

  await deliveriesCol(uid).add({
    segmentId: opts.segmentId ?? null,
    text: opts.text.slice(0, 500),
    recipients: userIds.length,
    mode,
    success: result.success,
    requestId: result.requestId ?? null,
    message: result.message,
    sentAt: new Date().toISOString(),
  });

  return {
    success: result.success,
    message: result.message,
    recipients: userIds.length,
    mode,
    requestId: result.requestId,
  };
}

export async function listDeliveries(uid: string, limit = 30) {
  const snap = await deliveriesCol(uid).orderBy('sentAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchProfileAndUpsert(
  uid: string,
  lineUserId: string,
  sourceId?: string | null,
): Promise<LineFriend> {
  const settings = await getUserSettings(uid);
  let profile: { displayName?: string; pictureUrl?: string; language?: string } | undefined;
  if (settings.lineChannelAccessToken) {
    const p = await getLineProfile(settings.lineChannelAccessToken, lineUserId);
    if (p.success) {
      profile = {
        displayName: p.displayName,
        pictureUrl: p.pictureUrl,
        language: p.language,
      };
    }
  }
  return upsertLineFriendOnFollow(uid, lineUserId, profile, sourceId);
}

export async function createRichMenuWithImage(
  uid: string,
  payload: {
    name: string;
    chatBarText: string;
    size: { width: number; height: number };
    areas: Array<{
      bounds: { x: number; y: number; width: number; height: number };
      action: { type: string; data?: string; uri?: string; label?: string };
    }>;
    imageBase64?: string;
    imageContentType?: string;
    setAsDefault?: boolean;
  },
): Promise<{ success: boolean; id?: string; lineRichMenuId?: string; message: string }> {
  const settings = await getUserSettings(uid);
  if (!settings.lineChannelAccessToken) {
    return { success: false, message: 'LINE Channel Access Token 未設定' };
  }

  const created = await createLineRichMenu(settings.lineChannelAccessToken, {
    name: payload.name,
    chatBarText: payload.chatBarText,
    size: payload.size,
    areas: payload.areas,
  });
  if (!created.success || !created.richMenuId) {
    return { success: false, message: created.message };
  }

  if (payload.imageBase64) {
    const buf = Uint8Array.from(Buffer.from(payload.imageBase64, 'base64'));
    const up = await uploadRichMenuImage(
      settings.lineChannelAccessToken,
      created.richMenuId,
      buf,
      payload.imageContentType ?? 'image/png',
    );
    if (!up.success) {
      return { success: false, message: up.message };
    }
  }

  if (payload.setAsDefault) {
    await setDefaultRichMenu(settings.lineChannelAccessToken, created.richMenuId);
  }

  const ref = await db().collection(`users/${uid}/lineRichMenus`).add({
    name: payload.name,
    chatBarText: payload.chatBarText,
    size: payload.size,
    areas: payload.areas,
    lineRichMenuId: created.richMenuId,
    isDefault: !!payload.setAsDefault,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    id: ref.id,
    lineRichMenuId: created.richMenuId,
    message: 'リッチメニューを作成しました',
  };
}

export async function touchFriendMessage(uid: string, lineUserId: string): Promise<void> {
  const ref = friendsCol(uid).doc(lineUserId);
  if ((await ref.get()).exists) {
    await ref.update({
      lastSeenAt: new Date().toISOString(),
      score: FieldValue.increment(1),
    });
  }
}
