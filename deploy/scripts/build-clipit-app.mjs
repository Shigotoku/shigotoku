/**
 * ClipIt アプリのみビルドし deploy/dist/clipit-app に配置（LP 全体ビルドを回避）
 * 用法: node scripts/build-clipit-app.mjs
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectEnv } from '../build.config.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = join(scriptDir, '..');
const root = join(deployDir, '..');
const appCwd = join(root, 'clipit', 'app');
const out = join(deployDir, 'dist', 'clipit-app');
const env = projectEnv['clipit-app'] ?? {};

console.log('Building clipit-app with projectEnv...\n');
execSync('npm run build', {
  cwd: appCwd,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...env },
});

mkdirSync(out, { recursive: true });
cpSync(join(appCwd, 'dist'), out, { recursive: true });
console.log(`\n✓ clipit-app -> ${out}`);
