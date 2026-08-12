import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = dirname(scriptDir);
const root = dirname(deployDir);
const apiSrc = join(root, 'clipit', 'api');
const apiDest = join(deployDir, 'functions', 'clipit-api');

rmSync(apiDest, { recursive: true, force: true });
mkdirSync(apiDest, { recursive: true });

for (const name of ['package.json', 'package-lock.json', 'lib']) {
  cpSync(join(apiSrc, name), join(apiDest, name), { recursive: true });
}

execSync('npm ci --omit=dev', { cwd: apiDest, stdio: 'inherit' });

console.log('✓ Prepared functions/clipit-api for Firebase deploy');
