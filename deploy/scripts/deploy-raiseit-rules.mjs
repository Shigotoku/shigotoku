/**
 * RaiseIt の Firestore ルールとインデックスをデプロイ(冪等)。
 * firebase login 不要。gcloud のログイン(RAISEIT の GCP プロジェクトへ権限のあるアカウント)を使う。
 *
 *   node scripts/deploy-raiseit-rules.mjs
 *   CLOUDSDK_CORE_ACCOUNT=meditoku.jp@gmail.com node scripts/deploy-raiseit-rules.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deployDir = dirname(dirname(fileURLToPath(import.meta.url)));
const PROJECT = process.env.RAISEIT_PROJECT ?? 'shigotoku-raiseit-prod';

function gcloudBin() {
  if (process.platform === 'win32') {
    const local = join(process.env.LOCALAPPDATA ?? '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
    if (existsSync(local)) return `"${local}"`;
  }
  return 'gcloud';
}
const g = gcloudBin();
const sh = (cmd, inherit = false) =>
  execSync(cmd, { encoding: 'utf8', shell: true, stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] })?.trim();

sh(`${g} services enable firebaserules.googleapis.com firestore.googleapis.com --project ${PROJECT}`, true);

const token = sh(`${g} auth print-access-token`);
const api = async (method, path, body) => {
  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return JSON.parse(text);
};

// 1. ルールセット作成(構文エラーはここで弾かれる)→ cloud.firestore リリースを更新
const content = readFileSync(join(deployDir, 'firestore.raiseit.rules'), 'utf8');
const ruleset = await api('POST', 'rulesets', { source: { files: [{ name: 'firestore.rules', content }] } });
const release = { name: `projects/${PROJECT}/releases/cloud.firestore`, rulesetName: ruleset.name };
try {
  await api('PATCH', 'releases/cloud.firestore', { release });
} catch {
  await api('POST', 'releases', release);
}
console.log(`✔ Firestore ルールを公開: ${ruleset.name}`);

// 2. 複合インデックス(既存は無視)
const { indexes } = JSON.parse(readFileSync(join(deployDir, 'firestore.raiseit.indexes.json'), 'utf8'));
for (const idx of indexes) {
  const fields = idx.fields.map((f) => `--field-config=field-path=${f.fieldPath},order=${f.order.toLowerCase()}`).join(' ');
  try {
    sh(`${g} firestore indexes composite create --collection-group=${idx.collectionGroup} --query-scope=${idx.queryScope.toLowerCase()} ${fields} --project ${PROJECT} --async --quiet`);
    console.log(`✔ インデックス作成: ${idx.collectionGroup}`);
  } catch (e) {
    const msg = String(e.stderr ?? e.message);
    if (/already exists|ALREADY_EXISTS/.test(msg)) console.log(`- インデックス既存: ${idx.collectionGroup}`);
    else throw e;
  }
}
