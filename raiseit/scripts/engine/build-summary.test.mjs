import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = join(dirname(fileURLToPath(import.meta.url)), 'build-summary.mjs');

// 管理画面と週次メールは summary.json だけを読む。出力が欠けると画面が古いまま止まるため、実行して確認する。
test('build-summary は summary.json と detail*.json を必ず書き出す', () => {
  const root = mkdtempSync(join(tmpdir(), 'raiseit-bs-'));
  const data = join(root, 'data');
  const reports = join(root, 'reports');
  mkdirSync(join(data, 't1', 'gsc-page'), { recursive: true });
  writeFileSync(join(data, 't1', 'gsc-page', '2026-10-20.ndjson'), JSON.stringify({ date: '2026-10-20', page: 'https://x.example/', clicks: 1, impressions: 10, position: 5 }) + '\n');
  const r = spawnSync(process.execPath, [script], { env: { ...process.env, DATA_ROOT: data, REPORT_ROOT: reports, SITE_ID: 't1', SITE_NAME: 'T1' }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const out = join(reports, 't1');
  for (const f of ['summary.json', 'detail.json', 'detail-7.json', 'detail-90.json']) assert.ok(existsSync(join(out, f)), `${f} が出力される`);
  const s = JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8'));
  assert.ok(Array.isArray(s.actions) && s.northStar, 'summary に actions と northStar がある');
});
