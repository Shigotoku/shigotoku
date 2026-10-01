/**
 * 既存ユーザーを accounts コレクションに移行（Firebase CLI トークン使用）
 * 用法: node scripts/migrate-accounts.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

const PROJECT = 'shigotoku-prod';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = join(scriptDir, '..', '..', '..', 'deploy');

const MIGRATIONS = [
  {
    email: 'r.tokunaga@meditoku.com',
    accountType: 'business',
    companyName: 'メディトク',
    billingStatus: 'monitor',
    plan: 'starter',
    billingExempt: true,
    billingExemptReason: '社内運用・開発',
    billingExemptGrantedBy: 'system-migration',
  },
  {
    email: 'y.ishii@meditoku.com',
    accountType: 'individual',
    billingStatus: 'monitor',
    plan: 'starter',
    billingExempt: true,
    billingExemptReason: 'モニター店舗',
    billingExemptGrantedBy: 'system-migration',
  },
];

function loadAccessToken() {
  const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const token = config.tokens?.access_token;
  if (!token) throw new Error('Firebase CLI にログインしてください');
  return token;
}

function exportAuthUsers() {
  const tmp = join(deployDir, '.tmp-migrate-auth.json');
  execSync(`npx firebase auth:export "${tmp}" --project ${PROJECT} --format json`, {
    cwd: deployDir,
    stdio: 'pipe',
  });
  return JSON.parse(readFileSync(tmp, 'utf8')).users ?? [];
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (Array.isArray(v)) {
      fields[k] = { arrayValue: { values: v.map((x) => ({ stringValue: x })) } };
    }
  }
  return fields;
}

async function getDoc(accessToken, path) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 404) return null;
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

function parseFields(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.arrayValue) out[k] = (v.arrayValue.values ?? []).map((x) => x.stringValue);
  }
  return out;
}

async function setDoc(accessToken, path, fields) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`set ${path}: ${await res.text()}`);
}

async function migrateOne(accessToken, authUser, spec) {
  const uid = authUser.localId;
  const userDoc = await getDoc(accessToken, `users/${uid}`);
  if (!userDoc) {
    console.warn(`  no user doc: ${spec.email}`);
    return;
  }
  const userData = parseFields(userDoc);
  if (userData.accountId) {
    console.log(`  skip (already migrated): ${spec.email} → ${userData.accountId}`);
    return;
  }

  const accountId = randomBytes(12).toString('hex');
  const now = new Date().toISOString();

  const accountFields = toFields({
    accountType: spec.accountType,
    billingStatus: spec.billingStatus,
    plan: spec.plan,
    billingExempt: spec.billingExempt,
    billingExemptType: 'monitor',
    billingExemptReason: spec.billingExemptReason,
    billingExemptGrantedBy: spec.billingExemptGrantedBy,
    includedSeats: 1,
    seatCount: 1,
    ownerUid: uid,
    paymentProvider: null,
    createdAt: now,
    ...(spec.accountType === 'business' ? { companyName: spec.companyName } : {}),
  });

  await setDoc(accessToken, `accounts/${accountId}`, accountFields);
  await setDoc(accessToken, `accounts/${accountId}/members/${uid}`, toFields({
    userId: uid,
    role: 'owner',
    email: authUser.email,
    displayName: authUser.displayName ?? '',
    createdAt: now,
  }));

  const mergedUser = {
    ...userDoc.fields,
    ...toFields({
      accountId,
      accountType: spec.accountType,
      accountSetupComplete: true,
      plan: spec.plan,
      email: authUser.email,
      displayName: authUser.displayName ?? '',
    }),
  };
  await setDoc(accessToken, `users/${uid}`, mergedUser);

  const storeIds = userData.storeIds ?? [];
  for (const storeId of storeIds) {
    const storeDoc = await getDoc(accessToken, `stores/${storeId}`);
    if (!storeDoc) continue;
    await setDoc(accessToken, `stores/${storeId}`, {
      ...storeDoc.fields,
      accountId: { stringValue: accountId },
    });
  }

  console.log(`  migrated: ${spec.email} → accounts/${accountId} (${spec.accountType}${spec.companyName ? ` / ${spec.companyName}` : ''})`);
}

async function main() {
  const accessToken = loadAccessToken();
  const authUsers = exportAuthUsers();
  console.log(`Migrating on ${PROJECT}...\n`);
  for (const spec of MIGRATIONS) {
    const authUser = authUsers.find((u) => u.email === spec.email);
    if (!authUser) {
      console.warn(`  not found: ${spec.email}`);
      continue;
    }
    await migrateOne(accessToken, authUser, spec);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
