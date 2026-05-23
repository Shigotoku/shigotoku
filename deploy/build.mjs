import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectEnv } from './build.config.mjs';

const deployDir = dirname(fileURLToPath(import.meta.url));
const root = join(deployDir, '..');
const out = join(deployDir, 'dist');

const projects = [
  { name: 'corporate-site', cwd: join(root, 'corporate-site'), out: join(out, 'web') },
  { name: 'runwith-landing', cwd: join(root, 'runwith/landing-page'), out: join(out, 'web/runwith') },
  { name: 'buzzit-landing', cwd: join(root, 'buzzit/landing-page'), out: join(out, 'web/buzzit') },
  { name: 'runwith-app', cwd: join(root, 'runwith/app'), out: join(out, 'runwith-app') },
  { name: 'buzzit-app', cwd: join(root, 'buzzit/app'), out: join(out, 'buzzit-app') },
];

function run(command, cwd, env = {}) {
  console.log(`\n> ${command}  (${cwd})`);
  const buildEnv = { ...process.env, ...env };
  // 本番ビルドに Supabase キーが混入しないよう明示的に空にする
  if (cwd.includes('runwith/app')) {
    buildEnv.VITE_SUPABASE_URL = '';
    buildEnv.VITE_SUPABASE_ANON_KEY = '';
  }
  execSync(command, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  });
}

console.log('Building all Shigotoku projects...\n');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'web'), { recursive: true });

for (const project of projects) {
  run('npm run build', project.cwd, projectEnv[project.name] ?? {});
  mkdirSync(dirname(project.out), { recursive: true });
  cpSync(join(project.cwd, 'dist'), project.out, { recursive: true });
  console.log(`✓ ${project.name} -> ${project.out}`);
}

writeFileSync(
  join(out, 'web/robots.txt'),
  `User-agent: *
Allow: /
Allow: /runwith/
Allow: /buzzit/

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

writeFileSync(join(out, 'web/sitemap.xml'), sitemapXml);

console.log('\nAll builds completed.');
console.log(`Output: ${out}`);
