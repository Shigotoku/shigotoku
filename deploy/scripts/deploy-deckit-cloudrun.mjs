/**

 * DeckIt を Cloud Run にデプロイ（shigotoku-deckit-prod）

 * ローカル Docker 不要 → Cloud Build でイメージ作成

 */

import { execSync } from 'node:child_process';

import { existsSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';

import { DECKIT_FIREBASE } from '../build.config.mjs';



const scriptDir = dirname(fileURLToPath(import.meta.url));

const deployDir = dirname(scriptDir);

const root = dirname(deployDir);



const PROJECT = 'shigotoku-deckit-prod';

const REGION = process.env.DECKIT_CLOUD_RUN_REGION ?? 'asia-northeast1';

const SERVICE = process.env.DECKIT_CLOUD_RUN_SERVICE ?? 'deckit-app';

const REPO = 'deckit';

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

    `${gcloud} artifacts repositories create ${REPO} --repository-format=docker --location=${REGION} --description="DeckIt"`,

  );

}



const subs = [

  `_IMAGE=${IMAGE}`,

  `_MODE=firebase`,

  `_API_KEY=${DECKIT_FIREBASE.apiKey}`,

  `_AUTH_DOMAIN=${DECKIT_FIREBASE.authDomain}`,

  `_PROJECT_ID=${DECKIT_FIREBASE.projectId}`,

  `_STORAGE_BUCKET=${DECKIT_FIREBASE.storageBucket}`,

  `_MESSAGING_SENDER_ID=${DECKIT_FIREBASE.messagingSenderId}`,

  `_APP_ID=${DECKIT_FIREBASE.appId}`,

].join(',');



run(

  `${gcloud} builds submit ${root} --config=${join(deployDir, 'cloudbuild.deckit.yaml')} --substitutions=${subs} --project=${PROJECT}`,

  { cwd: root },

);



const canonicalHost = 'app.deckit.shigotoku.com';

const envFlags = [

  'NEXT_PUBLIC_DECKIT_DATA_MODE=firebase',

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

    `--set-env-vars ${envFlags},GOOGLE_APPLICATION_CREDENTIALS=/secrets/deckit-admin.json ` +

    `--set-secrets=/secrets/deckit-admin.json=deckit-admin-sa:latest`,

);



const url = execSync(

  `${gcloud} run services describe ${SERVICE} --region ${REGION} --format="value(status.url)"`,

  { encoding: 'utf8', shell: true },

).trim();



console.log('\n✓ Cloud Run デプロイ完了');

console.log(`  URL: ${url}`);

console.log('  次: Firebase Console → Authentication → Authorized domains に上記ホストを追加');


