import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDigest } from './digest.mjs';

const summary = {
  site: { name: 'テスト' }, period: { from: '2026-09-26', to: '2026-10-23' },
  northStar: { label: '問い合わせ(リード)', cur: 10, deltaPct: 25 },
  seo: { clicks: 1000 }, funnel: { sessions: 500 }, ai: { sessions: 3 },
  thisWeek: ['a'], actions: [{ id: 'a', title: '<b>題</b>', impact: { label: '月+1件' }, confidenceLabel: '高', effortMin: 10 }],
  effects: [], freshness: [{ label: '検索', status: 'ok' }],
};

test('件名と本文に成果・今週やることが入り、HTMLはエスケープされる', () => {
  const d = buildDigest(summary, { appUrl: 'https://x.example' });
  assert.match(d.subject, /10件/);
  assert.match(d.text, /今週やること/);
  assert.match(d.text, /https:\/\/x\.example/);
  assert.ok(!d.html.includes('<b>題</b>'));
});
