#!/usr/bin/env node
// 週次ダイジェスト(メール)を有効にする。Resend の API キーを Secret Manager に入れ、ジョブに接続する。
//   $env:RESEND_API_KEY="re_..."; node scripts/setup-raiseit-mail.mjs
// 任意: DIGEST_FROM(既定 "RaiseIt <notify@raiseit.shigotoku.com>"。Resend で検証済みのドメインを使う) / RAISEIT_APP_URL
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT = process.env.RAISEIT_PROJECT ?? 'shigotoku-raiseit-prod';
const REGION = process.env.RAISEIT_REGION ?? 'asia-northeast1';
const SECRET = 'raiseit-resend-api-key';
const SA = `raiseit-reader@${PROJECT}.iam.gserviceaccount.com`;
const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error('RESEND_API_KEY を環境変数で渡してください');
  process.exit(2);
}
const local = join(process.env.LOCALAPPDATA ?? '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
const g = existsSync(local) ? `"${local}"` : 'gcloud';
const run = (c, input) => {
  console.log(`> ${c}`);
  const r = spawnSync(c, { shell: true, input, stdio: ['pipe', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error(`failed: ${c}`);
};

execSync(`${g} services enable secretmanager.googleapis.com --project ${PROJECT}`, { stdio: 'inherit' });
const exists = spawnSync(`${g} secrets describe ${SECRET} --project ${PROJECT}`, { shell: true, stdio: 'ignore' }).status === 0;
if (!exists) run(`${g} secrets create ${SECRET} --replication-policy=automatic --project ${PROJECT}`);
run(`${g} secrets versions add ${SECRET} --data-file=- --project ${PROJECT}`, key);
run(`${g} secrets add-iam-policy-binding ${SECRET} --member=serviceAccount:${SA} --role=roles/secretmanager.secretAccessor --project ${PROJECT}`);
const url = process.env.RAISEIT_APP_URL ?? execSync(`${g} run services describe raiseit-app --region ${REGION} --project ${PROJECT} --format="value(status.url)"`).toString().trim();
const from = process.env.DIGEST_FROM ?? 'RaiseIt <notify@raiseit.shigotoku.com>';
const { writeFileSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const envFile = join(tmpdir(), `raiseit-mail-env-${Date.now()}.yaml`);
writeFileSync(envFile, `APP_URL: "${url}"\nDIGEST_FROM: "${from}"\n`);
run(`${g} run jobs update raiseit-daily --region ${REGION} --project ${PROJECT} --update-secrets=RESEND_API_KEY=${SECRET}:latest --env-vars-file="${envFile}"`);
console.log('\n有効化しました。毎週月曜の朝のジョブで、有効なメンバー全員に送信されます。');
console.log('今すぐ試す: gcloud run jobs execute raiseit-daily --region asia-northeast1 --project shigotoku-raiseit-prod --update-env-vars DIGEST_FORCE=1');
