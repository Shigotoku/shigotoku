/**
 * DeckIt ローカル環境チェック（秘密値は表示しない）
 * 使い方: node scripts/deckit-doctor.mjs
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(appDir);
loadEnvConfig(appDir);

const checks = [];

function ok(name, pass, hint) {
  checks.push({ name, pass, hint });
}

const mode = process.env.NEXT_PUBLIC_DECKIT_DATA_MODE ?? process.env.NEXT_PUBLIC_SLIDE_DATA_MODE ?? '';
ok('DATA_MODE=firebase', mode === 'firebase', '.env.local に NEXT_PUBLIC_DECKIT_DATA_MODE=firebase');

for (const key of [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
]) {
  ok(key, Boolean(process.env[key]?.trim()), 'Firebase Console の Web アプリ設定を .env.local にコピー');
}

ok('FIREBASE_PROJECT_ID', Boolean(process.env.FIREBASE_PROJECT_ID?.trim()), 'FIREBASE_PROJECT_ID=shigotoku-deckit-prod');

const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
const credPath = gac
  ? path.isAbsolute(gac)
    ? gac
    : path.join(appDir, gac)
  : '';
ok('GOOGLE_APPLICATION_CREDENTIALS', Boolean(gac), './secrets/deckit-admin.json を推奨');
ok('Admin JSON ファイル', credPath && existsSync(credPath), `見つからない: ${credPath || '(未設定)'}`);

if (credPath && existsSync(credPath)) {
  try {
    const j = JSON.parse(readFileSync(credPath, 'utf8'));
    ok('JSON project_id', Boolean(j.project_id), 'サービスアカウント JSON が壊れている可能性');
  } catch {
    ok('JSON parse', false, 'JSON の読み込みに失敗');
  }
}

const failed = checks.filter((c) => !c.pass);
console.log('\nDeckIt doctor —', appDir, '\n');
for (const c of checks) {
  console.log(c.pass ? '  ✓' : '  ✗', c.name, c.hint ? `→ ${c.hint}` : '');
}
console.log(failed.length ? `\n${failed.length} 件要修正。直したら npm run dev\n` : '\n環境 OK。npm run dev → http://localhost:3000/login\n');
process.exit(failed.length ? 1 : 0);
