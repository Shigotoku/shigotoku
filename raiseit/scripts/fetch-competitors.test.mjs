import test from 'node:test';
import assert from 'node:assert/strict';
import { allowed, parseRobots, parseSitemap } from './fetch-competitors.mjs';

test('robots.txt: * グループの Disallow と Sitemap を読む', () => {
  const r = parseRobots('User-agent: Googlebot\nDisallow: /g/\n\nUser-agent: *\nDisallow: /private/\nSitemap: https://x.example/s.xml\n');
  assert.deepEqual(r.disallow, ['/private/']);
  assert.deepEqual(r.sitemaps, ['https://x.example/s.xml']);
  assert.equal(allowed(r, '/private/a'), false);
  assert.equal(allowed(r, '/blog/'), true);
});

test('sitemap: index と urlset を判別する', () => {
  assert.equal(parseSitemap('<sitemapindex><sitemap><loc>https://a/1.xml</loc></sitemap></sitemapindex>').isIndex, true);
  const u = parseSitemap('<urlset><url><loc>https://a/x?a=1&amp;b=2</loc></url></urlset>');
  assert.equal(u.isIndex, false);
  assert.deepEqual(u.locs, ['https://a/x?a=1&b=2']);
});
