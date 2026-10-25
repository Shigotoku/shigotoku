/**
 * レイジット (RaiseIt) 日次ジョブを GCP にデプロイ(冪等。何度実行してもよい)
 *   - 必要な API の有効化 / Firestore / GCS バケット / Artifact Registry
 *   - Cloud Build でイメージ作成 → Cloud Run Job 作成/更新
 *   - Cloud Scheduler(毎日 04:00 JST)で Job を起動
 * 認証は鍵ファイルなし。ジョブは raiseit-reader サービスアカウントで動く
 * (Search Console / GA4 に閲覧権限を付与済みのもの)。
 *
 *   node scripts/deploy-raiseit-job.mjs            # 全部
 *   node scripts/deploy-raiseit-job.mjs --infra    # インフラのみ(イメージ・Job は作らない)
 *   node scripts/deploy-raiseit-job.mjs --image    # イメージのビルドと Job 更新のみ
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deployDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = dirname(deployDir);

const PROJECT = process.env.RAISEIT_PROJECT ?? 'shigotoku-raiseit-prod';
const REGION = process.env.RAISEIT_REGION ?? 'asia-northeast1';
const TENANT = process.env.RAISEIT_TENANT ?? 'meditoku';
const BUCKET = process.env.RAISEIT_BUCKET ?? `${PROJECT}-data`;
const REPO = 'raiseit';
const JOB = 'raiseit-daily';
const RUNNER_SA = `raiseit-reader@${PROJECT}.iam.gserviceaccount.com`;
const SCHED_SA_NAME = 'raiseit-scheduler';
const SCHED_SA = `${SCHED_SA_NAME}@${PROJECT}.iam.gserviceaccount.com`;
const IMAGE = `${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/raiseit-job:latest`;

const onlyInfra = process.argv.includes('--infra');
const onlyImage = process.argv.includes('--image');

function gcloudBin() {
  if (process.platform === 'win32') {
    const local = join(process.env.LOCALAPPDATA ?? '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
    if (existsSync(local)) return `"${local}"`;
  }
  return 'gcloud';
}
const g = gcloudBin();

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}
function out(cmd) {
  return execSync(cmd, { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function exists(cmd) {
  try {
    out(cmd);
    return true;
  } catch {
    return false;
  }
}

// 他アプリ(shigotoku-*-prod)と同じアカウント・課金先を既定にする
const BILLING = process.env.RAISEIT_BILLING_ACCOUNT ?? '01842B-66EA51-A38CBC';
const OWNERS = (process.env.RAISEIT_EXTRA_OWNERS ?? 'r.tokunaga@meditoku.com').split(',').filter(Boolean);

if (!onlyImage) {
  if (!exists(`${g} projects describe ${PROJECT}`)) {
    run(`${g} projects create ${PROJECT} --name="Shigotoku RaiseIt"`);
  }
  if (out(`${g} billing projects describe ${PROJECT} --format="value(billingEnabled)"`) !== 'True') {
    run(`${g} billing projects link ${PROJECT} --billing-account=${BILLING}`);
  }
  for (const email of OWNERS) {
    run(`${g} projects add-iam-policy-binding ${PROJECT} --member=user:${email} --role=roles/editor --condition=None`);
  }

  run(
    `${g} services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com ` +
      `cloudscheduler.googleapis.com firestore.googleapis.com secretmanager.googleapis.com storage.googleapis.com ` +
      `searchconsole.googleapis.com analyticsdata.googleapis.com pagespeedonline.googleapis.com ` +
      `iamcredentials.googleapis.com firebase.googleapis.com --project ${PROJECT}`,
  );

  // ジョブ実行 SA(鍵なし)。Search Console / GA4 には、このメールを閲覧者として追加する
  if (!exists(`${g} iam service-accounts describe ${RUNNER_SA} --project ${PROJECT}`)) {
    run(`${g} iam service-accounts create raiseit-reader --display-name="RaiseIt reader" --project ${PROJECT}`);
  }
  // Cloud Build の既定実行 SA(新規プロジェクトでは Compute 既定 SA)に必要な権限
  const num = out(`${g} projects describe ${PROJECT} --format="value(projectNumber)"`);
  for (const role of ['roles/cloudbuild.builds.builder', 'roles/artifactregistry.writer', 'roles/storage.objectViewer']) {
    run(`${g} projects add-iam-policy-binding ${PROJECT} --member=serviceAccount:${num}-compute@developer.gserviceaccount.com --role=${role} --condition=None`);
  }

  if (!exists(`${g} firestore databases describe --database="(default)" --project ${PROJECT}`)) {
    run(`${g} firestore databases create --database="(default)" --location=${REGION} --type=firestore-native --project ${PROJECT}`);
  }

  if (!exists(`${g} storage buckets describe gs://${BUCKET} --project ${PROJECT}`)) {
    run(
      `${g} storage buckets create gs://${BUCKET} --location=${REGION} --uniform-bucket-level-access ` +
        `--public-access-prevention --project ${PROJECT}`,
    );
  }

  if (!exists(`${g} artifacts repositories describe ${REPO} --location=${REGION} --project ${PROJECT}`)) {
    run(`${g} artifacts repositories create ${REPO} --repository-format=docker --location=${REGION} --description="RaiseIt" --project ${PROJECT}`);
  }

  // ジョブ実行 SA の権限(最小限): バケットの読み書き + Firestore
  run(`${g} storage buckets add-iam-policy-binding gs://${BUCKET} --member=serviceAccount:${RUNNER_SA} --role=roles/storage.objectAdmin --project ${PROJECT}`);
  run(`${g} projects add-iam-policy-binding ${PROJECT} --member=serviceAccount:${RUNNER_SA} --role=roles/datastore.user --condition=None`);

  if (!exists(`${g} iam service-accounts describe ${SCHED_SA} --project ${PROJECT}`)) {
    run(`${g} iam service-accounts create ${SCHED_SA_NAME} --display-name="RaiseIt scheduler" --project ${PROJECT}`);
  }
}

if (!onlyInfra) {
  run(`${g} builds submit ${join(root, 'raiseit')} --config=${join(deployDir, 'cloudbuild.raiseit.yaml')} --substitutions=_IMAGE=${IMAGE} --project=${PROJECT}`, { cwd: root });

  const envVars = `TENANT_ID=${TENANT},GCS_BUCKET=${BUCKET},GOOGLE_CLOUD_PROJECT=${PROJECT},JOB_DAYS=7`;
  const verb = exists(`${g} run jobs describe ${JOB} --region ${REGION} --project ${PROJECT}`) ? 'update' : 'create';
  run(
    `${g} run jobs ${verb} ${JOB} --image ${IMAGE} --region ${REGION} --project ${PROJECT} ` +
      `--service-account ${RUNNER_SA} --set-env-vars ${envVars} --max-retries 1 --task-timeout 30m --memory 1Gi`,
  );

  run(`${g} run jobs add-iam-policy-binding ${JOB} --region ${REGION} --member=serviceAccount:${SCHED_SA} --role=roles/run.invoker --project ${PROJECT}`);

  const uri = `https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/jobs/${JOB}:run`;
  const schedVerb = exists(`${g} scheduler jobs describe ${JOB} --location ${REGION} --project ${PROJECT}`) ? 'update' : 'create';
  run(
    `${g} scheduler jobs ${schedVerb} http ${JOB} --location ${REGION} --project ${PROJECT} ` +
      `--schedule="0 4 * * *" --time-zone="Asia/Tokyo" --uri="${uri}" --http-method=POST ` +
      `--oauth-service-account-email=${SCHED_SA}`,
  );
}

console.log('\n✔ レイジット (RaiseIt) ジョブのデプロイ完了');
console.log(`  手動実行: gcloud run jobs execute ${JOB} --region ${REGION} --project ${PROJECT} --wait`);
