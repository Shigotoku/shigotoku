import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAnalytics } from './fetch-site-audit.mjs';

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
