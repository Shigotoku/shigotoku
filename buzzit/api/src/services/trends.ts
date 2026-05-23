import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface TrendTopic {
  id: string;
  topic: string;
  hook: string;
  platform: string;
  score: number;
  status: 'active' | 'used';
  source: 'gemini' | 'fallback';
  createdAt: string;
}

const FALLBACK_TRENDS: Omit<TrendTopic, 'id' | 'createdAt' | 'status'>[] = [
  { topic: '春のダメージケア', hook: '「春カラー前にこれやってないと…」で保存率UP', platform: 'reels', score: 92, source: 'fallback' },
  { topic: 'スタッフの裏話', hook: '「美容師が絶対言わない」系フックで親近感', platform: 'carousel', score: 88, source: 'fallback' },
  { topic: '失敗談→解決', hook: '【悲報】→【逆転】構成で完走率向上', platform: 'x_thread', score: 85, source: 'fallback' },
  { topic: '限定クーポン', hook: 'LINE友だち限定・今週末までで urgency', platform: 'line', score: 83, source: 'fallback' },
  { topic: 'ビフォーアフター', hook: '3秒で変化がわかる短尺リール', platform: 'reels', score: 90, source: 'fallback' },
];

function db() {
  return getFirestore();
}

async function generateTrendsWithGemini(industry: string): Promise<Omit<TrendTopic, 'id' | 'createdAt' | 'status'>[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return FALLBACK_TRENDS;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${industry}向けSNSの「今週乗るべきトレンドネタ」を5件、JSONのみで返してください。
各ネタは美容室・サロンが今日投稿できる具体性を持つこと。

形式:
{"trends":[{"topic":"...","hook":"...","platform":"reels|carousel|x_thread|line","score":80-99}]}`,
          }],
        }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
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
      trends: Array<{ topic: string; hook: string; platform: string; score: number }>;
    };
    return parsed.trends.slice(0, 5).map((t) => ({
      topic: t.topic,
      hook: t.hook,
      platform: t.platform,
      score: Math.min(99, Math.max(70, t.score ?? 80)),
      source: 'gemini' as const,
    }));
  } catch (err) {
    console.warn('Trend Gemini fallback:', err);
    return FALLBACK_TRENDS;
  }
}

export async function getTrends(uid: string, limit = 5): Promise<TrendTopic[]> {
  const snap = await db()
    .collection('users')
    .doc(uid)
    .collection('trends')
    .orderBy('score', 'desc')
    .limit(limit * 3)
    .get();

  return snap.docs
    .map((d) => {
      const data = d.data();
      const created = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString();
      return {
        id: d.id,
        topic: data.topic as string,
        hook: data.hook as string,
        platform: data.platform as string,
        score: data.score as number,
        status: data.status as TrendTopic['status'],
        source: data.source as TrendTopic['source'],
        createdAt: created,
      };
    })
    .filter((t) => t.status === 'active')
    .slice(0, limit);
}

export async function refreshTrends(uid: string, industry?: string): Promise<TrendTopic[]> {
  const label = industry === 'salon' ? '美容室・ヘアサロン' : 'BtoC店舗';
  const generated = await generateTrendsWithGemini(label);

  const batch = db().batch();
  const col = db().collection('users').doc(uid).collection('trends');

  const old = await col.where('status', '==', 'active').get();
  for (const doc of old.docs) {
    batch.update(doc.ref, { status: 'used' });
  }

  const created: TrendTopic[] = [];
  for (const t of generated) {
    const ref = col.doc();
    batch.set(ref, {
      ...t,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });
    created.push({
      id: ref.id,
      ...t,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }
  await batch.commit();
  return created.sort((a, b) => b.score - a.score);
}

export async function markTrendUsed(uid: string, trendId: string): Promise<TrendTopic | null> {
  const ref = db().collection('users').doc(uid).collection('trends').doc(trendId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update({ status: 'used', usedAt: FieldValue.serverTimestamp() });
  const data = snap.data()!;
  return {
    id: snap.id,
    topic: data.topic as string,
    hook: data.hook as string,
    platform: data.platform as string,
    score: data.score as number,
    status: 'used',
    source: data.source as TrendTopic['source'],
    createdAt: new Date().toISOString(),
  };
}

export async function refreshTrendsForAllUsers(): Promise<number> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const snap = await getFirestore().collection('users').get();
  let count = 0;
  for (const doc of snap.docs) {
    const plan = doc.data().plan as string;
    if (!['pro', 'team', 'growth'].includes(plan)) continue;
    try {
      await refreshTrends(doc.id, doc.data().industry as string | undefined);
      count++;
    } catch (err) {
      console.error(`Trend refresh failed for ${doc.id}:`, err);
    }
  }
  return count;
}

export async function pickTrendIdea(uid: string): Promise<string | null> {
  const trends = await getTrends(uid, 1);
  if (!trends.length) return null;
  const top = trends[0];
  await markTrendUsed(uid, top.id);
  return `${top.topic} — ${top.hook}`;
}
