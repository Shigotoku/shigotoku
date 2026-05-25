import { cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deployDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(deployDir, '..', '..');
cpSync(join(repoRoot, 'buzzit', 'api', 'storage.rules'), join(deployDir, '..', 'storage.rules'));
