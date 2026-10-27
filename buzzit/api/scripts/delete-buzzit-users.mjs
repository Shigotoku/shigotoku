/**
 * BuzzIt 本番の指定 Auth ユーザーと関連 Firestore データを削除
 * 用法: node scripts/delete-buzzit-users.mjs meditoku.jp@gmail.com admin@shigotoku.com
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const PROJECT = 'shigotoku-prod';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = join(scriptDir, '..', '..', '..', 'deploy');

const args = process.argv.slice(2);
const TARGET_EMAILS = args.filter((a) => !a.startsWith('--uid='));
const TARGET_UIDS = args.filter((a) => a.startsWith('--uid=')).map((a) => a.slice(6));
if (TARGET_EMAILS.length === 0 && TARGET_UIDS.length === 0) {
  console.error('Usage: node scripts/delete-buzzit-users.mjs <email> [...] [--uid=<uid> ...]');
  process.exit(1);
}

function loadAccessToken() {
  const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const token = config.tokens?.access_token;
  if (!token) throw new Error('Firebase CLI にログインしていません。deploy で npx firebase login を実行してください。');
  return token;
}

async function api(accessToken, path, options = {}) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${path} failed (${res.status}): ${text}`);
  return body;
}

async function listCollectionIds(accessToken, docPath) {
  const body = await api(accessToken, `${docPath}:listCollectionIds`);
  return body.collectionIds ?? [];
}

async function listDocuments(accessToken, collectionPath) {
  const docs = [];
  let pageToken;
  do {
    const qs = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collectionPath}${qs}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await res.json();
    if (!res.ok) throw new Error(`list ${collectionPath} failed: ${JSON.stringify(body)}`);
    for (const doc of body.documents ?? []) {
      docs.push(doc.name.replace(`projects/${PROJECT}/databases/(default)/documents/`, ''));
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return docs;
}

async function deleteDocumentRecursive(accessToken, docPath) {
  const collectionIds = await listCollectionIds(accessToken, docPath);
  for (const colId of collectionIds) {
    const children = await listDocuments(accessToken, `${docPath}/${colId}`);
    for (const child of children) {
      await deleteDocumentRecursive(accessToken, child);
    }
  }
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`delete ${docPath} failed (${res.status}): ${text}`);
  }
  console.log(`  deleted doc: ${docPath}`);
}

function parseFields(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.arrayValue) out[k] = (v.arrayValue.values ?? []).map((x) => x.stringValue ?? x);
    else out[k] = v;
  }
  return out;
}

async function getUserDoc(accessToken, uid) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 404) return null;
  const body = await res.json();
  if (!res.ok) throw new Error(`get user ${uid} failed: ${JSON.stringify(body)}`);
  return parseFields(body);
}

async function deleteTrackingForUid(accessToken, uid) {
  const docs = await listDocuments(accessToken, 'tracking');
  for (const docPath of docs) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${docPath}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) continue;
    const body = await res.json();
    const fields = parseFields(body);
    if (fields.uid === uid) {
      await deleteDocumentRecursive(accessToken, docPath);
    }
  }
}

function exportAuthUsers() {
  const tmp = join(deployDir, '.tmp-buzzit-auth-export.json');
  execSync(`npx firebase auth:export "${tmp}" --project ${PROJECT} --format json`, {
    cwd: deployDir,
    stdio: 'pipe',
  });
  const data = JSON.parse(readFileSync(tmp, 'utf8'));
  return data.users ?? [];
}

async function batchDeleteAuth(accessToken, localIds) {
  if (localIds.length === 0) return;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchDelete`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ localIds, force: true }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`batchDelete failed (${res.status}): ${text}`);
  }
}

async function deleteUserData(accessToken, uid, email) {
  console.log(`\n=== ${email} (${uid}) ===`);

  const userData = await getUserDoc(accessToken, uid);
  const storeIds = userData?.storeIds ?? [];

  for (const storeId of storeIds) {
    console.log(`  store: ${storeId}`);
    await deleteDocumentRecursive(accessToken, `stores/${storeId}`);
  }

  await deleteTrackingForUid(accessToken, uid);
  await deleteDocumentRecursive(accessToken, `users/${uid}`);
}

async function main() {
  const accessToken = loadAccessToken();
  const authUsers = exportAuthUsers();
  const emailTargets = authUsers.filter((u) => TARGET_EMAILS.includes(u.email));
  const uidTargets = TARGET_UIDS.map((uid) => {
    const found = authUsers.find((u) => u.localId === uid);
    return found ?? { localId: uid, email: '(uid only)' };
  });
  const targets = [...emailTargets, ...uidTargets.filter((u) => !emailTargets.some((e) => e.localId === u.localId))];

  if (targets.length === 0) {
    console.log('対象の Auth ユーザーが見つかりませんでした。');
    return;
  }

  const missing = TARGET_EMAILS.filter((e) => !targets.some((t) => t.email === e));
  if (missing.length) {
    console.warn('Auth に存在しないメール（スキップ）:', missing.join(', '));
  }

  for (const u of targets) {
    await deleteUserData(accessToken, u.localId, u.email);
  }

  console.log('\n=== Firebase Auth 削除 ===');
  for (const u of targets) {
    console.log(`  auth delete: ${u.email}`);
  }
  await batchDeleteAuth(accessToken, targets.map((u) => u.localId));

  console.log(`\n完了: ${targets.length} 件のアカウントを削除しました。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
