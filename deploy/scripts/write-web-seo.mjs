/**
 * shigotoku-web 向け robots.txt / sitemap.xml を dist/web に書き出す
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} webOut deploy/dist/web */
export function writeWebSeo(webOut) {
  writeFileSync(
    join(webOut, 'robots.txt'),
    `User-agent: *
Allow: /
Allow: /runwith/
Allow: /buzzit/
Allow: /clipit/

Sitemap: https://shigotoku.com/sitemap.xml
`,
  );

  const sitemapUrls = [
    { loc: 'https://shigotoku.com/', changefreq: 'weekly', priority: '1.0' },
    { loc: 'https://shigotoku.com/privacy/', changefreq: 'yearly', priority: '0.3' },
    { loc: 'https://shigotoku.com/terms/', changefreq: 'yearly', priority: '0.3' },
    { loc: 'https://shigotoku.com/tokushoho/', changefreq: 'yearly', priority: '0.3' },
    { loc: 'https://shigotoku.com/security/', changefreq: 'yearly', priority: '0.3' },
    { loc: 'https://shigotoku.com/runwith/', changefreq: 'weekly', priority: '0.9' },
    { loc: 'https://shigotoku.com/runwith/pricing/', changefreq: 'monthly', priority: '0.8' },
    { loc: 'https://shigotoku.com/buzzit/', changefreq: 'weekly', priority: '0.9' },
    { loc: 'https://shigotoku.com/clipit/', changefreq: 'weekly', priority: '0.9' },
    { loc: 'https://shigotoku.com/clipit/pricing/', changefreq: 'monthly', priority: '0.8' },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  writeFileSync(join(webOut, 'sitemap.xml'), sitemapXml);
}
