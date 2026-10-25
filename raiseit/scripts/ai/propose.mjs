// AI提案: reports/<site>/issues.json の課題ごとに修正案(Markdown)を生成し、承認待ちとして保存する。
// 実行: npm run ai:propose -- --site <id> [--limit 3] [--dry]
// 承認: npm run ai:review -- --site <id> (一覧) / --approve <id> / --reject <id>
// 承認済み提案のGit PR化は未実装(次段階)。AIの出力は必ず人が承認するまで何も変更しない。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, reportDir, dataDir } from '../lib.mjs';
import { complete, aiConfig } from './provider.mjs';

loadEnv();
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const dir = dataDir('proposals');
mkdirSync(dir, { recursive: true });
const pfile = (id) => join(dir, `${id}.json`);
const all = () => readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));

const mode = argv[0];
if (mode === 'review') {
  const ap = arg('--approve'), rj = arg('--reject');
  if (ap || rj) {
    const id = ap || rj;
    if (!existsSync(pfile(id))) { console.error('提案が見つかりません: ' + id); process.exit(1); }
    const p = JSON.parse(readFileSync(pfile(id), 'utf8'));
    p.status = ap ? 'approved' : 'rejected'; p.reviewedAt = new Date().toISOString();
    writeFileSync(pfile(id), JSON.stringify(p, null, 2));
    console.log(`${p.status}: ${p.title}`);
  } else for (const p of all()) console.log(`[${p.status}] ${p.id}  ${p.title}`);
  process.exit(0);
}

const cfg = aiConfig();
const issues = JSON.parse(readFileSync(join(reportDir(), 'issues.json'), 'utf8'));
const limit = Number(arg('--limit') || 3);
console.log(`AI: ${cfg.provider} / ${cfg.model} ${cfg.isLocal ? '(ローカル)' : '(外部API・BYO)'}`);
const SYSTEM = 'あなたは医療機関サイトのSEO・表示速度の改善担当です。医療広告ガイドラインに反する表現(体験談・誇大・比較優良・ビフォーアフター等)は提案しません。変更は最小限・見た目を変えない方針で、具体的な差分案を日本語のMarkdownで出してください。';
let n = 0;
for (const it of issues) {
  if (n >= limit) break;
  const id = `${new Date().toISOString().slice(0, 10)}-${it.id}`;
  if (existsSync(pfile(id))) continue;
  if (argv.includes('--dry')) { console.log('[dry] ' + it.title); n++; continue; }
  try {
    const body = await complete({ system: SYSTEM, user: it.ai });
    writeFileSync(pfile(id), JSON.stringify({ id, issueId: it.id, title: it.title, url: it.url, status: 'pending', model: cfg.model, provider: cfg.provider, createdAt: new Date().toISOString(), body }, null, 2));
    console.log('提案作成: ' + id); n++;
  } catch (e) { console.error('失敗: ' + e.message); break; }
}
