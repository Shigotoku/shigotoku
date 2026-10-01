/**
 * ClipIt Storage バケットに CORS を設定（エクスポート用）。
 * gsutil / gcloud が PATH にあること。
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const corsFile = join(scriptDir, '..', 'storage.cors.clipit.json');

const buckets = ['gs://shigotoku-clipit-prod-ad9ee.firebasestorage.app'];

for (const bucket of buckets) {
  console.log(`Setting CORS on ${bucket}...`);
  execSync(`gsutil cors set "${corsFile}" ${bucket}`, { stdio: 'inherit' });
}

console.log('Done: ClipIt Storage CORS applied.');
