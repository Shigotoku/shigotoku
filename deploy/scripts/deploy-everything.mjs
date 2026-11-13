/**
 * 全プロダクトを一括デプロイ（Firebase Hosting / Functions / ルール / Cloud Run）
 *
 * 用法（deploy フォルダで）:
 *   npm run deploy:everything                 # 全部
 *   npm run deploy:everything -- --only=buzzit,clipit
 *   npm run deploy:everything -- --skip=raiseit,deckit
 *
 * 1 つのステップが失敗しても残りは続行し、最後に結果一覧を出す（失敗があれば exit 1）。
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectEnv } from '../build.config.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = join(scriptDir, '..');
const root = join(deployDir, '..');

const arg = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split('=')[1]
    ?.split(',')
    .filter(Boolean);
const only = arg('only');
const skip = arg('skip') ?? [];

function run(cmd, cwd = deployDir, env = {}) {
  console.log(`\n> ${cmd}\n  (${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
}

function ensureDeps(dir) {
  if (!existsSync(join(dir, 'node_modules'))) {
    run(existsSync(join(dir, 'package-lock.json')) ? 'npm ci' : 'npm install', dir);
  }
}

/** アプリ 1 つだけをビルドして deploy/dist/<name> に配置 */
function buildApp(name, relDir) {
  const cwd = join(root, relDir);
  ensureDeps(cwd);
  run('npm run build', cwd, projectEnv[name] ?? {});
  const out = join(deployDir, 'dist', name);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(dirname(out), { recursive: true });
  cpSync(join(cwd, 'dist'), out, { recursive: true });
}

const fb = (project, config, only) =>
  `npx firebase deploy --project ${project} --config ${config} --only ${only}`;

const targets = [
  {
    name: 'web', // shigotoku.com（コーポレート + 全 LP）
    run: () => run('npm run deploy:clipit-web'),
  },
  {
    name: 'buzzit',
    run: () => {
      buildApp('buzzit-app', 'buzzit/app');
      run('npm run build:buzzit-api');
      run(fb('buzzit', 'firebase.buzzit.json', 'hosting:buzzit-app,functions:buzzit-api,storage,firestore'));
    },
  },
  {
    name: 'runwith',
    run: () => {
      buildApp('runwith-app', 'runwith/app');
      run(fb('runwith', 'firebase.runwith.json', 'hosting:runwith-app,storage,firestore'));
    },
  },
  {
    name: 'clipit',
    run: () => {
      run('npm run build:clipit-app');
      run('npm run build:clipit-api');
      run(fb('clipit', 'firebase.clipit.json', 'hosting:clipit-app,functions:clipit-api,storage,firestore'));
    },
  },
  { name: 'shapeit', run: () => run('npm run deploy:shapeit') },
  { name: 'predeck', run: () => run('npm run deploy:predeck') },
  {
    name: 'deckit',
    run: () => {
      run('npm run deploy:deckit-firestore');
      run('npm run deploy:deckit');
    },
  },
  {
    name: 'raiseit',
    run: () => {
      run('npm run deploy:raiseit');
      run('npm run deploy:raiseit-app');
    },
  },
];

// ビルドに必要な依存をまとめて用意（node_modules が無いものだけ）
const depDirs = [
  'corporate-site',
  'runwith/landing-page', 'runwith/app',
  'buzzit/landing-page', 'buzzit/app', 'buzzit/api',
  'clipit/landing-page', 'clipit/app', 'clipit/api',
  'shapeit/landing-page', 'shapeit/app', 'shapeit/api',
  'deckit/landing-page', 'deckit/app',
  'PreDeck/landing-page', 'PreDeck/app', 'PreDeck/api',
  'raiseit/landing-page', 'raiseit/app',
];
for (const d of depDirs) {
  const dir = join(root, d);
  if (existsSync(join(dir, 'package.json'))) ensureDeps(dir);
}

const selected = targets.filter((t) => (!only || only.includes(t.name)) && !skip.includes(t.name));
const results = [];

for (const t of selected) {
  console.log(`\n========== ${t.name} ==========`);
  try {
    t.run();
    results.push({ name: t.name, ok: true });
  } catch (e) {
    console.error(`✗ ${t.name} failed: ${e.message}`);
    results.push({ name: t.name, ok: false });
  }
}

console.log('\n========== 結果 ==========');
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}`);
if (results.some((r) => !r.ok)) process.exit(1);
