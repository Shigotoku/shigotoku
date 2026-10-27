/**
 * DeckIt: Firebase Hosting → Cloud Run プロキシ + カスタムドメイン準備
 *
 * 使い方:
 *   cd deploy
 *   npm run setup:deckit-hosting
 *   npm run deploy:deckit-hosting
 *
 * その後 Console でカスタムドメイン app.deckit.shigotoku.com を追加し DNS を設定
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const root = dirname(deployDir);
const PROJECT = 'shigotoku-deckit-prod';
const SITE = 'shigotoku-deckit-app';
const REGION = 'asia-northeast1';
const SERVICE = 'deckit-app';
const PN = '174186643296';

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', shell: true, cwd: root, ...opts });
}

const npxFirebase = 'npx firebase';

try {
  execSync(`${npxFirebase} hosting:sites:get ${SITE} --project ${PROJECT}`, {
    stdio: 'pipe',
    shell: true,
    cwd: deployDir,
  });
  console.log(`Hosting サイト ${SITE} は既に存在します`);
} catch {
  run(`${npxFirebase} hosting:sites:create ${SITE} --project ${PROJECT}`, { cwd: deployDir });
}

const gcloud =
  process.platform === 'win32'
    ? `"${process.env.LOCALAPPDATA}\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd"`
    : 'gcloud';

const hostingSa = `service-${PN}@gcp-sa-firebasehosting.iam.gserviceaccount.com`;
try {
  run(
    `${gcloud} run services add-iam-policy-binding ${SERVICE} ` +
      `--region=${REGION} --project=${PROJECT} ` +
      `--member=serviceAccount:${hostingSa} --role=roles/run.invoker`,
  );
} catch {
  console.log('（Hosting → Run の invoker は既に付与済みの可能性があります）');
}

console.log('\n次の手順:');
console.log('  1. npm run deploy:deckit-hosting');
console.log('  2. Firebase Console → Hosting →', SITE, '→ カスタムドメイン app.deckit.shigotoku.com');
console.log('  3. 表示された DNS をお名前.com 等に追加');
console.log('  4. Authentication → Authorized domains に app.deckit.shigotoku.com');
console.log('  5. DNS/SSL 有効後: npm run deploy:deckit-cloudrun');
console.log('     必要なら Cloud Run に CANONICAL_REDIRECT_RUN_APP=true を追加');
