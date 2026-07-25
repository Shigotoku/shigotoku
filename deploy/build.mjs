import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectEnv } from './build.config.mjs';
import { writeWebSeo } from './scripts/write-web-seo.mjs';

const deployDir = dirname(fileURLToPath(import.meta.url));
const root = join(deployDir, '..');
const out = join(deployDir, 'dist');

const projects = [
  { name: 'corporate-site', cwd: join(root, 'corporate-site'), out: join(out, 'web') },
  { name: 'runwith-landing', cwd: join(root, 'runwith/landing-page'), out: join(out, 'web/runwith') },
  { name: 'buzzit-landing', cwd: join(root, 'buzzit/landing-page'), out: join(out, 'web/buzzit') },
  { name: 'clipit-landing', cwd: join(root, 'clipit/landing-page'), out: join(out, 'web/clipit') },
  { name: 'runwith-app', cwd: join(root, 'runwith/app'), out: join(out, 'runwith-app') },
  { name: 'buzzit-app', cwd: join(root, 'buzzit/app'), out: join(out, 'buzzit-app') },
  { name: 'clipit-app', cwd: join(root, 'clipit/app'), out: join(out, 'clipit-app') },
];

function run(command, cwd, env = {}) {
  console.log(`\n> ${command}  (${cwd})`);
  const buildEnv = { ...process.env, ...env };
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

writeWebSeo(join(out, 'web'));

console.log('\nAll builds completed.');
console.log(`Output: ${out}`);
