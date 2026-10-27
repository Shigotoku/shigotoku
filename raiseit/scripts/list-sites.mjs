// 対象サイトIDを1行ずつ出力する(run-daily.ps1 から利用)。
import { readSites } from './lib.mjs';
const s = readSites();
console.log((s.length ? s.map((x) => x.id) : ['default']).join('\n'));