/**
 * レイジット (RaiseIt): Firebase Hosting → Cloud Run プロキシ + カスタムドメイン準備
 * (DeckIt の setup-deckit-hosting.mjs と同じ構成。冪等 = 何度実行してもよい)
 *
 * 使い方:
 *   cd deploy
 *   npm run setup:raiseit-hosting     # Hosting サイト作成 + Run invoker 付与 + 空の公開フォルダ作成
 *   npm run deploy:raiseit-hosting    # 全パスを Cloud Run raiseit-app に転送する設定を公開
 *
 * その後 Firebase Console でカスタムドメイン app.raiseit.shigotoku.com を追加し、DNS を設定する。
 * 前提: firebase login 済み(プロジェクトに権限のあるアカウント)、gcloud ログイン済み。
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const PROJECT = process.env.RAISEIT_PROJECT ?? 'shigotoku-raiseit-prod';
const SITE = 'shigotoku-raiseit-app';
const REGION = process.env.RAISEIT_REGION ?? 'asia-northeast1';
const SERVICE = 'raiseit-app';
const PN = '973742525375';
const DOMAIN = 'app.raiseit.shigotoku.com';

function gcloudBin() {
  if (process.platform === 'win32') {
    const local = join(process.env.LOCALAPPDATA ?? '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
    if (existsSync(local)) return `"${local}"`;
  }
  return 'gcloud';
}

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', shell: true, cwd: deployDir, ...opts });
}

// 1) 公開フォルダ(中身は使わない。全パスを Cloud Run へ転送するため、空のスタブでよい)
const stub = join(deployDir, 'dist', 'raiseit-hosting-stub');
mkdirSync(stub, { recursive: true });
// index.html は置かない(実ファイルが rewrite より優先され、トップが Cloud Run に届かなくなる)
rmSync(join(stub, 'index.html'), { force: true });
writeFileSync(join(stub, '_stub.txt'), 'RaiseIt hosting stub: all paths are rewritten to Cloud Run\n');

// 2) Hosting API の有効化 + サイト作成
try {
  run(`${gcloudBin()} services enable firebasehosting.googleapis.com --project ${PROJECT}`);
} catch {
  console.log('（firebasehosting API の有効化に失敗。すでに有効なら問題ありません）');
}
try {
  execSync(`npx firebase hosting:sites:get ${SITE} --project ${PROJECT}`, { stdio: 'pipe', shell: true, cwd: deployDir });
  console.log(`Hosting サイト ${SITE} は既に存在します`);
} catch {
  run(`npx firebase hosting:sites:create ${SITE} --project ${PROJECT}`);
}

// 3) Hosting から Cloud Run を呼べるようにする(サービスは未認証許可だが、念のため付与。失敗しても続行)
try {
  run(
    `${gcloudBin()} run services add-iam-policy-binding ${SERVICE} --region=${REGION} --project=${PROJECT} ` +
      `--member=serviceAccount:service-${PN}@gcp-sa-firebasehosting.iam.gserviceaccount.com --role=roles/run.invoker`,
  );
} catch {
  console.log('（Hosting → Run の invoker は既に付与済み、または不要の可能性があります）');
}

console.log('\n次の手順:');
console.log('  1. npm run deploy:raiseit-hosting');
console.log(`  2. Firebase Console → ${PROJECT} → Hosting → ${SITE} → カスタムドメインに ${DOMAIN} を追加`);
console.log('  3. 表示された DNS(A / TXT)を Cloudflare に追加(プロキシはオフ = 「DNS のみ」)');
console.log(`  4. Authentication → 設定 → 承認済みドメイン に ${DOMAIN} を追加`);
