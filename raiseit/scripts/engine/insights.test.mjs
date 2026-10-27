import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, buildSummary } from './insights.mjs';

const today = '2026-10-25';
const days = (n) => Array.from({ length: n }, (_, i) => addDays('2026-10-23', -i));

function base() {
  const ga4ev = days(56).flatMap((date, i) => [
    { date, eventName: 'generate_lead', count: i < 28 ? 2 : 1 },
    { date, eventName: 'form_start', count: 3 },
  ]);
  const ga4src = days(56).map((date) => ({ date, sessions: 30, engagedSessions: 20, keyEvents: 0, channel: 'Organic Search', source: 'google', medium: 'organic' }));
  return { site: { id: 't', name: 'T', industry: 'general' }, today, gscPage: [], gscQuery: [], ga4src, ga4ev, ga4conv: [], psi: [], actions: [] };
}

test('addDays は日付を加減算する', () => {
  assert.equal(addDays('2026-10-25', -1), '2026-10-24');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('成果(リード)を前期間と比較する', () => {
  const s = buildSummary(base());
  assert.equal(s.northStar.event, 'generate_lead');
  assert.equal(s.northStar.cur, 56);
  assert.equal(s.northStar.prev, 28);
  assert.equal(s.northStar.deltaPct, 100);
});

test('キーイベント未設定なら計測の改善候補が最優先で出る', () => {
  const s = buildSummary(base());
  assert.ok(s.actions.some((a) => a.id === 'trk-key-event'));
  for (const a of s.actions) {
    assert.ok(a.why.length && a.how.length, `${a.id} に理由と手順がある`);
    assert.ok(['low', 'mid', 'high'].includes(a.risk));
  }
  const sorted = [...s.actions].sort((a, b) => b.priority - a.priority).map((a) => a.id);
  assert.deepEqual(s.actions.map((a) => a.id), sorted);
});

test('データが空でも落ちない', () => {
  const s = buildSummary({ site: { id: 'x', name: 'X' }, today });
  assert.equal(s.northStar.cur, 0);
  assert.ok(Array.isArray(s.actions));
});

test('公開ページ監査: 医療広告の疑い・noindex・不備が改善候補になる', () => {
  const inp = base();
  inp.audit = [
    { date: today, page: 'https://x.example/a/', status: 200, title: 'T', desc: '', h1Count: 1, canonical: 'https://x.example/a/', robots: '', blocks: [{ label: '体験談', match: '体験談', advice: '' }] },
    { date: today, page: 'https://x.example/b/', status: 200, title: 'T', desc: 'd', h1Count: 2, canonical: '', robots: 'noindex', blocks: [] },
    { date: today, page: 'https://x.example/c/', status: 404, blocks: [] },
  ];
  const s = buildSummary(inp);
  const ids = s.actions.map((a) => a.id);
  for (const id of ['aud-compliance', 'aud-noindex', 'aud-meta', 'aud-http']) assert.ok(ids.includes(id), id);
  assert.equal(s.actions.find((a) => a.id === 'aud-compliance').risk, 'high');
  assert.equal(s.audit.checked, 3);
});

test('計測の乖離: ページ群別に分解し、タグ未検出のページ群を原因として示す', () => {
  const inp = base();
  const d = days(28);
  inp.gscPage = d.flatMap((date) => [
    { date, page: 'https://x.example/', clicks: 5 },
    { date, page: 'https://x.example/blog/a/', clicks: 20 },
  ]);
  inp.ga4src = d.flatMap((date) => [
    { date, sessions: 10, engagedSessions: 5, keyEvents: 0, channel: 'Organic Search', source: 'google', medium: 'organic', landingPage: '/' },
    { date, sessions: 1, engagedSessions: 1, keyEvents: 0, channel: 'Organic Search', source: 'google', medium: 'organic', landingPage: '/blog/a/' },
  ]);
  inp.audit = [
    { date: today, page: 'https://x.example/', status: 200, title: 'T', desc: 'd', h1Count: 1, canonical: 'https://x.example/', robots: '', blocks: [], hasAnalytics: true, ga4Ids: ['G-AAAA'] },
    { date: today, page: 'https://x.example/blog/a/', status: 200, title: 'T', desc: 'd', h1Count: 1, canonical: 'https://x.example/blog/a/', robots: '', blocks: [], hasAnalytics: false, ga4Ids: [] },
    { date: today, page: 'https://x.example/blog/b/', status: 200, title: 'T', desc: 'd', h1Count: 1, canonical: 'https://x.example/blog/b/', robots: '', blocks: [], hasAnalytics: false, ga4Ids: [] },
  ];
  const s = buildSummary(inp);
  const gap = s.actions.find((a) => a.id === 'trk-gap');
  assert.ok(gap, 'trk-gap が出る');
  const text = gap.why.join('\n');
  assert.match(text, /\/blog\/ はクリック560件/);
  assert.match(text, /タグ\(GA4\/GTM\)が見つからないページ群: \/blog\/\(2件中2件/);
  assert.ok(!text.includes(': /(') && !text.includes(' / /('), 'タグのあるトップは原因に含めない');
  assert.ok(gap.how[0].includes('/blog/'));
  assert.equal(gap.evidence.sections[0].section, '/blog/');
});

test('計測の乖離: 監査にタグ情報が無い古いデータでも従来の文面で出る', () => {
  const inp = base();
  const d = days(28);
  inp.gscPage = d.map((date) => ({ date, page: 'https://x.example/', clicks: 20 }));
  inp.ga4src = d.map((date) => ({ date, sessions: 2, engagedSessions: 1, keyEvents: 0, channel: 'Organic Search', source: 'google', medium: 'organic', landingPage: '/' }));
  inp.audit = [{ date: today, page: 'https://x.example/', status: 200, title: 'T', desc: 'd', h1Count: 1, canonical: '', robots: '', blocks: [] }];
  const gap = buildSummary(inp).actions.find((a) => a.id === 'trk-gap');
  assert.ok(gap);
  assert.match(gap.why.join('\n'), /同意バナーでGA4が止まっている/);
});
