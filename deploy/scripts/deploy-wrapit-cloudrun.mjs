/**
 * WrapIt を Cloud Run にデプロイ（shigotoku-wrapit-prod）
 * ローカル Docker 不要 → Cloud Build でイメージ作成
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WRAPIT_FIREBASE } from '../build.config.mjs';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const root = dirname(deployDir);
const PROJECT = 'shigotoku-wrapit-prod';
const REGION = process.env.WRAPIT_CLOUD_RUN_REGION ?? 'asia-northeast1';
const SERVICE = process.env.WRAPIT_CLOUD_RUN_SERVICE ?? 'wrapit-app';
const REPO = 'wrapit';
const IMAGE = `${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:latest`;
function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}
function gcloudBin() {
  if (process.platform === 'win32') {
    const local = join(
      process.env.LOCALAPPDATA ?? '',
      'Google',
      'Cloud SDK',
      'google-cloud-sdk',
      'bin',
      'gcloud.cmd',
    );
    if (existsSync(local)) return `"${local}"`;
  }
  return 'gcloud';
}
const gcloud = gcloudBin();
run(`${gcloud} config set project ${PROJECT}`);
try {
  execSync(
    `${gcloud} artifacts repositories describe ${REPO} --location=${REGION}`,
    { stdio: 'pipe', shell: true },
  );
} catch {
  run(
    `${gcloud} artifacts repositories create ${REPO} --repository-format=docker --location=${REGION} --description="WrapIt"`,
  );
}
const subs = [
  `_IMAGE=${IMAGE}`,
  `_MODE=firebase`,
  `_API_KEY=${WRAPIT_FIREBASE.apiKey}`,
  `_AUTH_DOMAIN=${WRAPIT_FIREBASE.authDomain}`,
  `_PROJECT_ID=${WRAPIT_FIREBASE.projectId}`,
  `_STORAGE_BUCKET=${WRAPIT_FIREBASE.storageBucket}`,
  `_MESSAGING_SENDER_ID=${WRAPIT_FIREBASE.messagingSenderId}`,
  `_APP_ID=${WRAPIT_FIREBASE.appId}`,
].join(',');
run(
  `${gcloud} builds submit ${root} --config=${join(deployDir, 'cloudbuild.wrapit.yaml')} --substitutions=${subs} --project=${PROJECT}`,
  { cwd: root },
);
const canonicalHost = 'app.wrapit.shigotoku.com';
const envFlags = [
  'NEXT_PUBLIC_WRAPIT_DATA_MODE=firebase',
  `FIREBASE_PROJECT_ID=${PROJECT}`,
  `CANONICAL_HOST=${canonicalHost}`,
].join(',');
run(
  `${gcloud} run deploy ${SERVICE} ` +
    `--image ${IMAGE} ` +
    `--region ${REGION} ` +
    `--platform managed ` +
    `--allow-unauthenticated ` +
    `--port 8080 ` +
    `--set-env-vars ${envFlags},GOOGLE_APPLICATION_CREDENTIALS=/secrets/wrapit-admin.json ` +
    `--set-secrets=/secrets/wrapit-admin.json=wrapit-admin-sa:latest`,
);
const url = execSync(
  `${gcloud} run services describe ${SERVICE} --region ${REGION} --format="value(status.url)"`,
  { encoding: 'utf8', shell: true },
).trim();
console.log('\n✓ Cloud Run デプロイ完了');
console.log(`  URL: ${url}`);
console.log('  次: Firebase Console → Authentication → Authorized domains に上記ホストを追加');
