/**
 * レイジット (RaiseIt): テナント(顧客アカウント)を Firestore に作成/更新する(冪等)。
 * 既定は「メディトク」を 1 ユーザー(テナント)として登録。
 *
 *   RAISEIT_PROJECT=shigotoku-raiseit-prod node scripts/cloud/seed-tenant.mjs
 *
 * 認証(どちらか):
 *   - 既定: Application Default Credentials(Admin SDK)
 *   - ADC が別プロジェクトのサービスアカウント偽装などで使えない場合は、gcloud ユーザーのトークンで
 *     Firestore REST API に直接書く:
 *       $env:RAISEIT_ACCESS_TOKEN = gcloud auth print-access-token --account <メール>
 * オーナーの Firebase Auth uid は初回ログイン時に members/{uid} として紐づける(Phase 2 の認証実装)。
 * それまではサーバー(Admin SDK)側のみが読み書きする。
 */
import { randomUUID } from 'node:crypto';

const PROJECT = process.env.RAISEIT_PROJECT ?? 'shigotoku-raiseit-prod';
const token = process.env.RAISEIT_ACCESS_TOKEN;

const tenant = { id: 'meditoku', name: 'メディトク', plan: 'internal', ownerEmail: 'r.tokunaga@meditoku.com' };
const sites = [
  {
    id: 'meditoku',
    name: 'メディトク',
    industry: 'general',
    gscSite: 'sc-domain:meditoku.com',
    ga4PropertyId: '538602599',
    active: true,
  },
];

/** 書き込み層: set(path, data) — data は merge される。updatedAt はサーバー側で付ける。 */
async function makeWriter() {
  if (!token) {
    const { initializeApp } = await import('firebase-admin/app');
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    initializeApp({ projectId: PROJECT });
    const db = getFirestore();
    return (path, data) => db.doc(path).set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  const toValue = (v) =>
    typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) };
  return async (path, data) => {
    const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)]));
    fields.updatedAt = { timestampValue: new Date().toISOString() };
    const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?${mask}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  };
}

const set = await makeWriter();
const org = `raiseit_organizations/${tenant.id}`;
await set(org, { name: tenant.name, plan: tenant.plan, ownerEmail: tenant.ownerEmail });
for (const { id, ...data } of sites) await set(`${org}/sites/${id}`, { ...data, tenantId: tenant.id });
await set(`${org}/auditLogs/${randomUUID()}`, { action: 'tenant.seed', by: 'seed-tenant.mjs' });
console.log(`✔ テナント ${tenant.id} とサイト ${sites.map((s) => s.id).join(', ')} を登録しました (${PROJECT})`);
