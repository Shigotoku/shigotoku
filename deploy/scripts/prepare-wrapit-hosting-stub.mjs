/**
 * WrapIt Hosting（Cloud Run プロキシ）用の空スタブを作る。
 * 注意: index.html を置かないこと。静的ファイルが rewrite より優先され、/ が空白ページになる。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'wrapit-hosting-stub');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'stub.txt'), 'stub: all paths are rewritten to Cloud Run\n');
console.log(`✓ ${dir}`);
