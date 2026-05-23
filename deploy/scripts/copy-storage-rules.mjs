import { cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deployDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(deployDir);
cpSync(join(root, 'buzzit', 'api', 'storage.rules'), join(deployDir, 'storage.rules'));
