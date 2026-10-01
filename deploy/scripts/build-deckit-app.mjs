/**
 * DeckIt (Next.js standalone) をビルドし deploy/dist/deckit-app に配置
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectEnv } from '../build.config.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const root = dirname(deployDir);
const appCwd = join(root, 'Slide_Studio', 'app');
const out = join(deployDir, 'dist', 'deckit-app');
const env = projectEnv['deckit-app'] ?? {};

console.log('Building DeckIt app...\n');
execSync('npm run build', {
  cwd: appCwd,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...env },
});

const standalone = join(appCwd, '.next', 'standalone');
const staticDir = join(appCwd, '.next', 'static');
const publicDir = join(appCwd, 'public');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(standalone, out, { recursive: true });
mkdirSync(join(out, '.next', 'static'), { recursive: true });
cpSync(staticDir, join(out, '.next', 'static'), { recursive: true });
cpSync(publicDir, join(out, 'public'), { recursive: true });

console.log(`\n✓ deckit-app (standalone) -> ${out}`);
console.log('  Cloud Run: node server.js (WORKDIR=deckit-app)');
