import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAnalytics, detectSiteFacts } from './fetch-site-audit.mjs';
import { aggregateSiteFacts } from './engine/insights.mjs';

test('サイトの作り・同意バナー・フォームを検出する', () => {
  const html = '<script src="/_next/x.js"></script><script src="https://consent.cookiebot.com/uc.js"></script><script>gtag("consent","default",{})</script>'
    + '<form><input type="hidden" name="t"><input name="email" required><input name="tel"><textarea name="body" required></textarea><button>送信</button></form>';
  const f = detectSiteFacts(html);
  assert.equal(f.framework, 'Next.js');
  assert.equal(f.cmp, 'Cookiebot');
  assert.equal(f.consentMode, true);
  assert.deepEqual(f.forms, [{ fieldCount: 3, requiredCount: 2, names: ['email', 'tel', 'body'] }]);
});

test('見つからないものは推測せず null にする', () => {
  const f = detectSiteFacts('<p>hello</p>');
  assert.deepEqual(f, { framework: null, cmp: null, consentMode: false, forms: [] });
});

test('facts を集約する', () => {
  const rows = [
    { status: 200, page: 'https://a/', ga4Ids: ['G-1'], facts: { framework: 'Next.js', cmp: null, consentMode: false, forms: [] } },
    { status: 200, page: 'https://a/contact/', ga4Ids: ['G-1'], facts: { framework: 'Next.js', cmp: 'Cookiebot', consentMode: true, forms: [{ fieldCount: 4, requiredCount: 3, names: [] }] } },
  ];
  const s = aggregateSiteFacts(rows);
  assert.equal(s.framework, 'Next.js');
  assert.equal(s.cmp, 'Cookiebot');
  assert.deepEqual(s.ga4Ids, ['G-1']);
  assert.equal(s.forms[0].page, 'https://a/contact/');
});

test('GA4 の gtag.js と config を検出する', () => {
  const html = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script><script>gtag(\'config\', \'G-ABC123XYZ\');</script>';
  const r = detectAnalytics(html);
  assert.deepEqual(r.ga4Ids, ['G-ABC123XYZ']);
  assert.equal(r.hasAnalytics, true);
});

test('GTM コンテナを検出する', () => {
  const r = detectAnalytics('<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCD12"></script>');
  assert.deepEqual(r.gtmIds, ['GTM-ABCD12']);
  assert.equal(r.hasAnalytics, true);
});

test('dns-prefetch だけでは計測タグ扱いにしない', () => {
  const r = detectAnalytics('<link rel="dns-prefetch" href="https://www.googletagmanager.com" /><script>function gtag(){dataLayer.push(arguments);}</script>');
  assert.equal(r.hasAnalytics, false);
  assert.deepEqual(r.ga4Ids, []);
});
