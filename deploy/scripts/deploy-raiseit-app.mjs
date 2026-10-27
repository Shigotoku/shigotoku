#!/usr/bin/env node
// RaiseIt アプリ(Cloud Run service `raiseit-app`)のビルドとデプロイ。
//   node scripts/deploy-raiseit-app.mjs            ビルド + デプロイ
//   node scripts/deploy-raiseit-app.mjs --no-build 既存イメージで再デプロイ
// 環境変数: RAISEIT_PROJECT / RAISEIT_REGION / RAISEIT_TENANT / RAISEIT_OWNER_EMAILS(カンマ区切り)
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deployDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = dirname(deployDir);
const PROJECT = process.env.RAISEIT_PROJECT ?? 'shigotoku-raiseit-prod';
const REGION = process.env.RAISEIT_REGION ?? 'asia-northeast1';
const TENANT = process.env.RAISEIT_TENANT ?? 'meditoku';
const OWNERS = process.env.RAISEIT_OWNER_EMAILS ?? 'r.tokunaga@meditoku.com';
const BUCKET = `${PROJECT}-data`;
const SA = `raiseit-reader@${PROJECT}.iam.gserviceaccount.com`;
const IMAGE = `${REGION}-docker.pkg.dev/${PROJECT}/raiseit/raiseit-app:latest`;

const gcloud = (() => {
  const local = join(process.env.LOCALAPPDATA ?? '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
  return existsSync(local) ? `"${local}"` : 'gcloud';
})();
const run = (c) => {
  console.log(`\n> ${c}`);
  execSync(c, { stdio: 'inherit' });
};

if (!process.argv.includes('--no-build')) {
  run(`${gcloud} builds submit "${join(root, 'raiseit')}" --config="${join(deployDir, 'cloudbuild.raiseit-app.yaml')}" --substitutions=_IMAGE=${IMAGE} --project=${PROJECT}`);
}
// カンマ入りの値があるため env-vars-file(YAML)で渡す
const envFile = join(tmpdir(), `raiseit-env-${Date.now()}.yaml`);
writeFileSync(envFile, `TENANT_ID: "${TENANT}"\nGCS_BUCKET: "${BUCKET}"\nOWNER_EMAILS: "${OWNERS}"\n`);
run(
  `${gcloud} run deploy raiseit-app --image=${IMAGE} --region=${REGION} --project=${PROJECT} --service-account=${SA} --allow-unauthenticated --memory=512Mi --max-instances=3 --env-vars-file="${envFile}"`,
);
console.log('\n公開 URL を Firebase Auth の「承認済みドメイン」に追加してください(deploy-raiseit-app 後に1回)。');

