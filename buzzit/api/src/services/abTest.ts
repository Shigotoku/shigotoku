import { FieldValue, getFirestore, Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore';
import { generateTrackingToken, trackingClickUrl } from './tracking';
import { createTrackingLink, getUserSettings } from './firestore';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface AbVariant {
  label: string;
  content: string;
  trackingUrl?: string;
  trackingToken?: string;
  clicks: number;
  impressions: number;
}

export interface AbTestRecord {
  id: string;
  idea: string;
  platform: string;
  status: 'running' | 'completed';
  variantA: AbVariant;
  variantB: AbVariant;
  winner?: 'A' | 'B';
  winnerReason?: string;
  createdAt: string;
  completedAt?: string;
}

function db() {
  return getFirestore();
}

async function generateVariants(idea: string, platform: string): Promise<{ variantA: AbVariant; variantB: AbVariant }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallback = {
    variantA: {
      label: '感情フック型',
      content: `【保存版】${idea}\n\n共感から入るストーリー型。まず「あるある」で止める。`,
      clicks: 0,
      impressions: 0,
    },
    variantB: {
      label: '質問フック型',
      content: `知ってた？${idea}\n\n疑問形で始め、3行目で答えを提示する構成。`,
      clicks: 0,
      impressions: 0,
    },
  };
  if (!apiKey) return fallback;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `SNS投稿のA/Bテスト用に「${idea}」の${platform}向け台本を2パターン生成。JSONのみ。

{"variantA":{"label":"感情フック型","content":"..."},"variantB":{"label":"質問フック型","content":"..."}}

各150文字以内。医療・薬機法NG表現禁止。`,
          }],
        }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    const parsed = JSON.parse(match[0]) as {
      variantA: { label: string; content: string };
      variantB: { label: string; content: string };
    };
    return {
      variantA: { ...parsed.variantA, clicks: 0, impressions: 0 },
      variantB: { ...parsed.variantB, clicks: 0, impressions: 0 },
    };
  } catch {
    return fallback;
  }
}

async function attachTracking(
  uid: string,
  testId: string,
  variant: 'A' | 'B',
  v: AbVariant,
  platform: string,
): Promise<AbVariant> {
  const settings = await getUserSettings(uid);
  const dest = settings.defaultDestinationUrl;
  if (!dest) return v;

  const token = generateTrackingToken();
  await createTrackingLink(uid, {
    token,
    destinationUrl: dest,
    utmCampaign: `ab_${testId}_${variant.toLowerCase()}`,
    platform,
    title: `AB ${variant}: ${v.label}`,
  });
  await db().collection('tracking').doc(token).set(
    { abTestId: testId, abVariant: variant },
    { merge: true },
  );
  return {
    ...v,
    trackingToken: token,
    trackingUrl: trackingClickUrl(token),
    impressions: 1,
  };
}

export async function createAbTest(uid: string, idea: string, platform: string): Promise<AbTestRecord> {
  const variants = await generateVariants(idea, platform);
  const ref = db().collection('users').doc(uid).collection('abTests').doc();

  let variantA = variants.variantA;
  let variantB = variants.variantB;
  variantA = await attachTracking(uid, ref.id, 'A', variantA, platform);
  variantB = await attachTracking(uid, ref.id, 'B', variantB, platform);

  const record = {
    idea,
    platform,
    status: 'running' as const,
    variantA,
    variantB,
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(record);

  return {
    id: ref.id,
    idea,
    platform,
    status: 'running',
    variantA,
    variantB,
    createdAt: new Date().toISOString(),
  };
}

export async function getAbTests(uid: string, limit = 10): Promise<AbTestRecord[]> {
  const snap = await db()
    .collection('users')
    .doc(uid)
    .collection('abTests')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((d) => mapAbTest(d)!).filter(Boolean);
}

function mapAbTest(d: DocumentSnapshot): AbTestRecord | null {
  if (!d.exists) return null;
  const data = d.data();
  if (!data) return null;
  const created = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : new Date().toISOString();
  const completed = data.completedAt instanceof Timestamp
    ? data.completedAt.toDate().toISOString()
    : undefined;
  return {
    id: d.id,
    idea: data.idea as string,
    platform: data.platform as string,
    status: data.status as AbTestRecord['status'],
    variantA: data.variantA as AbVariant,
    variantB: data.variantB as AbVariant,
    winner: data.winner as AbTestRecord['winner'],
    winnerReason: data.winnerReason as string | undefined,
    createdAt: created,
    completedAt: completed,
  };
}

export async function incrementAbVariantMetric(
  uid: string,
  testId: string,
  variant: 'A' | 'B',
  field: 'clicks' | 'impressions',
): Promise<void> {
  const key = variant === 'A' ? 'variantA' : 'variantB';
  await db().collection('users').doc(uid).collection('abTests').doc(testId).update({
    [`${key}.${field}`]: FieldValue.increment(1),
  });
}

export async function evaluateAbTest(uid: string, testId: string): Promise<AbTestRecord | null> {
  const ref = db().collection('users').doc(uid).collection('abTests').doc(testId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  if (data.status === 'completed') return mapAbTest(snap)!;

  const a = data.variantA as AbVariant;
  const b = data.variantB as AbVariant;
  const aRate = a.impressions > 0 ? a.clicks / a.impressions : 0;
  const bRate = b.impressions > 0 ? b.clicks / b.impressions : 0;

  let winner: 'A' | 'B' = aRate >= bRate ? 'A' : 'B';
  let winnerReason = `クリック率 A:${(aRate * 100).toFixed(1)}% vs B:${(bRate * 100).toFixed(1)}%`;

  if (a.clicks + b.clicks < 2) {
    winner = a.clicks >= b.clicks ? 'A' : 'B';
    winnerReason = 'クリック数が少ないため暫定判定（データ蓄積後に再評価推奨）';
  }

  await ref.update({
    status: 'completed',
    winner,
    winnerReason,
    completedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return mapAbTest(updated);
}

export async function evaluateAllRunningAbTests(uid: string): Promise<number> {
  const snap = await db()
    .collection('users')
    .doc(uid)
    .collection('abTests')
    .where('status', '==', 'running')
    .get();

  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const totalClicks = (data.variantA?.clicks ?? 0) + (data.variantB?.clicks ?? 0);
    const created = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    const hoursOld = (Date.now() - created.getTime()) / (1000 * 60 * 60);
    if (totalClicks >= 5 || hoursOld >= 48) {
      await evaluateAbTest(uid, doc.id);
      count++;
    }
  }
  return count;
}

export async function evaluateAbTestsForAllUsers(): Promise<number> {
  const snap = await db().collection('users').get();
  let total = 0;
  for (const doc of snap.docs) {
    const plan = doc.data().plan as string;
    if (!['pro', 'team', 'growth'].includes(plan)) continue;
    try {
      total += await evaluateAllRunningAbTests(doc.id);
    } catch (err) {
      console.error(`AB evaluate failed for ${doc.id}:`, err);
    }
  }
  return total;
}
