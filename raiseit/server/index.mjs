// レイジット (RaiseIt) アプリサーバー(Cloud Run service)。
// SPA(app/dist)の配信 + /api。認証は Firebase ID トークン、権限は Firestore の members で判定する。
// テナントは環境変数 TENANT_ID 固定(現在はメディトクのみ)。クライアントから Firestore/GCS へは直接触れない。
import express from 'express';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { checkText } from '../scripts/medical-ad-check.mjs';

const TENANT = process.env.TENANT_ID || 'meditoku';
const BUCKET = process.env.GCS_BUCKET;
const OWNERS = (process.env.OWNER_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const STATUSES = ['open', 'approved', 'done', 'skipped'];
const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'app', 'dist');

initializeApp({ storageBucket: BUCKET });
const db = getFirestore();
const bucket = getStorage().bucket();
const org = db.doc(`raiseit_organizations/${TENANT}`);

const app = express();
app.disable('x-powered-by');
// 非公開アプリ: 検索エンジンに載せない + 基本のセキュリティヘッダ
app.use((_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.get('/robots.txt', (_req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
app.use(express.json({ limit: '200kb' }));

app.get('/healthz', (_req, res) => res.send('ok'));

async function auth(req, res, next) {
  try {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) return res.status(401).json({ error: 'unauthorized' });
    const t = await getAuth().verifyIdToken(m[1]);
    const ref = org.collection('members').doc(t.uid);
    let snap = await ref.get();
    const email = (t.email || '').toLowerCase();
    if (!snap.exists && email && t.email_verified !== false && OWNERS.includes(email)) {
      await ref.set({ email, role: 'owner', active: true, createdAt: FieldValue.serverTimestamp() });
      snap = await ref.get();
    }
    if (!snap.exists || snap.data().active === false) return res.status(403).json({ error: 'forbidden' });
    req.user = { uid: t.uid, email, role: snap.data().role || 'viewer' };
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
const canWrite = (req, res, next) => (['owner', 'admin', 'editor'].includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' }));

async function siteOf(req, res) {
  const id = String(req.query.site || req.body?.site || '');
  const snap = id ? await org.collection('sites').doc(id).get() : null;
  if (!snap?.exists || snap.data().active === false) {
    res.status(404).json({ error: 'site not found' });
    return null;
  }
  return { id, ...snap.data() };
}

// Firebase 標準の action ハンドラは使わず、アプリ内の /auth/action でパスワードを設定する
function ownLink(link, req) {
  const code = new URL(link).searchParams.get('oobCode');
  return `https://${req.get('host')}/auth/action?mode=resetPassword&oobCode=${code}`;
}

const api = express.Router();
api.use(auth);

api.get('/me', (req, res) => res.json({ ...req.user, tenant: TENANT }));

api.get('/sites', async (_req, res) => {
  const s = await org.collection('sites').get();
  res.json(s.docs.filter((d) => d.data().active !== false).map((d) => ({ id: d.id, name: d.data().name || d.id, url: d.data().url || '' })));
});

api.get('/summary', async (req, res) => {
  const site = await siteOf(req, res);
  if (!site) return;
  const f = bucket.file(`tenants/${TENANT}/${site.id}/reports/summary.json`);
  const [ok] = await f.exists();
  if (!ok) return res.status(404).json({ error: 'summary not ready' });
  const [buf] = await f.download();
  const summary = JSON.parse(buf.toString('utf8'));
  const st = await org.collection('proposals').where('siteId', '==', site.id).get();
  const state = {};
  st.forEach((d) => (state[d.data().actionId] = { status: d.data().status, note: d.data().note || '', by: d.data().by, updatedAt: d.data().updatedAt?.toDate?.().toISOString() }));
  res.setHeader('Cache-Control', 'no-store');
  res.json({ summary, state });
});

// 施策の記録(効果測定の起点)。data/<site>/actions/<date>.ndjson に追記する
async function appendAction(siteId, row) {
  const file = bucket.file(`tenants/${TENANT}/${siteId}/data/actions/${row.date}.ndjson`);
  const [exists] = await file.exists();
  const old = exists ? (await file.download())[0].toString('utf8') : '';
  await file.save(old + JSON.stringify(row) + '\n', { contentType: 'application/x-ndjson' });
}

api.get('/detail', async (req, res) => {
  const site = await siteOf(req, res);
  if (!site) return;
  const suffix = { 7: '-7', 90: '-90' }[String(req.query.days)] ?? '';
  const f = bucket.file(`tenants/${TENANT}/${site.id}/reports/detail${suffix}.json`);
  const [ok] = await f.exists();
  if (!ok) return res.status(404).json({ error: 'detail not ready' });
  res.setHeader('Cache-Control', 'no-store');
  res.type('json').send((await f.download())[0]);
});

// 過去の施策を後から記録する(日付は過去でも可)
api.post('/history', canWrite, async (req, res) => {
  const site = await siteOf(req, res);
  if (!site) return;
  const date = String(req.body?.date || '');
  const note = String(req.body?.note || '').trim().slice(0, 300);
  const url = String(req.body?.url || '').trim().slice(0, 500);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !note || (url && !/^https?:\/\//.test(url))) return res.status(400).json({ error: 'bad request' });
  await appendAction(site.id, { date, url, note, recordedAt: new Date().toISOString(), by: req.user.email });
  await org.collection('auditLogs').add({ at: FieldValue.serverTimestamp(), by: req.user.email, type: 'history.add', siteId: site.id, date, note });
  res.json({ ok: true });
});
api.post('/actions/:id', canWrite, async (req, res) => {
  const site = await siteOf(req, res);
  if (!site) return;
  const actionId = req.params.id;
  const { status } = req.body || {};
  const note = String(req.body?.note || '').slice(0, 500);
  if (!STATUSES.includes(status) || !/^[\w.-]{1,120}$/.test(actionId)) return res.status(400).json({ error: 'bad request' });
  const ref = org.collection('proposals').doc(`${site.id}__${actionId}`);
  const prev = (await ref.get()).data()?.status ?? 'open';
  await ref.set({ siteId: site.id, actionId, status, note, by: req.user.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await org.collection('auditLogs').add({ at: FieldValue.serverTimestamp(), by: req.user.email, type: 'action.status', siteId: site.id, actionId, from: prev, to: status, note });
  // 「実施済み」は効果測定の起点として data/<site>/actions に追記する(夜間ジョブが前後比較する)
  if (status === 'done' && prev !== 'done') {
    const date = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const title = String(req.body?.title || actionId).slice(0, 200);
    await appendAction(site.id, { date, url: String(req.body?.url || '').slice(0, 500), note: `${title}${note ? ' / ' + note : ''}`, actionId, recordedAt: new Date().toISOString() });
  }
  res.json({ ok: true });
});

api.post('/compliance/check', (req, res) => {
  const text = String(req.body?.text || '').slice(0, 20000);
  if (!text.trim()) return res.status(400).json({ error: 'text required' });
  res.json(checkText(text));
});

// ---- メンバー管理(owner / admin のみ)。招待 = アカウント作成 + パスワード設定リンクの発行 ----
const ROLES = ['owner', 'admin', 'editor', 'viewer'];
const isAdmin = (req, res, next) => (['owner', 'admin'].includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' }));

api.get('/members', isAdmin, async (_req, res) => {
  const s = await org.collection('members').get();
  res.json(s.docs.map((d) => ({ uid: d.id, email: d.data().email, role: d.data().role, active: d.data().active !== false })));
});

api.post('/members', isAdmin, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = String(req.body?.role || 'viewer');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !ROLES.includes(role)) return res.status(400).json({ error: 'bad request' });
  if (role === 'owner' && req.user.role !== 'owner') return res.status(403).json({ error: 'forbidden' });
  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch {
    user = await getAuth().createUser({ email, emailVerified: true, password: randomBytes(18).toString('base64url') });
  }
  await org.collection('members').doc(user.uid).set({ email, role, active: true, invitedBy: req.user.email, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  await org.collection('auditLogs').add({ at: FieldValue.serverTimestamp(), by: req.user.email, type: 'member.upsert', email, role });
  const link = await getAuth().generatePasswordResetLink(email);
  res.json({ ok: true, uid: user.uid, setPasswordLink: ownLink(link, req) });
});

api.patch('/members/:uid', isAdmin, async (req, res) => {
  const ref = org.collection('members').doc(req.params.uid);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'not found' });
  const upd = {};
  if (req.body?.role !== undefined) {
    if (!ROLES.includes(req.body.role) || (req.user.role !== 'owner' && (req.body.role === 'owner' || snap.data().role === 'owner'))) return res.status(403).json({ error: 'forbidden' });
    upd.role = req.body.role;
  }
  if (req.body?.active !== undefined) upd.active = !!req.body.active;
  if (req.params.uid === req.user.uid && (upd.active === false || (upd.role && upd.role !== req.user.role))) return res.status(400).json({ error: '自分自身は変更できません' });
  await ref.set(upd, { merge: true });
  await org.collection('auditLogs').add({ at: FieldValue.serverTimestamp(), by: req.user.email, type: 'member.update', uid: req.params.uid, ...upd });
  res.json({ ok: true });
});

// ---- 競合の登録(観測対象)。夜間ジョブ(週次)が公開情報だけを読み取る ----
function safeCompetitorUrl(raw) {
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(u.protocol) || !h.includes('.') || /^\d+(\.\d+){3}$/.test(h) || h.includes(':') || /(^|\.)(local|localhost|internal|lan)$/.test(h) || u.username || u.password) return null;
  return u.origin + (u.pathname === '/' ? '/' : u.pathname);
}

api.get('/competitors', async (req, res) => {
  const site = await siteOf(req, res);
  res.json(site ? site.competitors ?? [] : []);
});

api.put('/competitors', isAdmin, async (req, res) => {
  const site = await siteOf(req, res);
  if (!site) return;
  const list = Array.isArray(req.body?.competitors) ? req.body.competitors.slice(0, 10) : null;
  if (!list) return res.status(400).json({ error: 'bad request' });
  const out = [];
  for (const c of list) {
    const url = safeCompetitorUrl(c?.url);
    const name = String(c?.name || '').trim().slice(0, 60);
    if (!url || !name) return res.status(400).json({ error: `不正な競合: ${name || c?.url}` });
    const id = new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    if (out.some((x) => x.id === id)) continue;
    out.push({ id, name, url });
  }
  await org.collection('sites').doc(site.id).set({ competitors: out }, { merge: true });
  await org.collection('auditLogs').add({ at: FieldValue.serverTimestamp(), by: req.user.email, type: 'competitors.update', siteId: site.id, count: out.length });
  res.json(out);
});

api.get('/runs', async (_req, res) => {
  const s = await org.collection('runs').orderBy('finishedAt', 'desc').limit(14).get();
  res.json(s.docs.map((d) => ({ id: d.id, ...d.data() })));
});

app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.use((req, res, next) => (['GET', 'HEAD'].includes(req.method) ? res.sendFile(join(dist, 'index.html')) : next()));
}

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`raiseit-app listening on ${port}`));
