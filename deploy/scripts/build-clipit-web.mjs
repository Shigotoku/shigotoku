/**
 * クリッピット LP + コーポレート（Clipit セクション）のみビルドし dist/web に配置
 * 用法: node scripts/build-clipit-web.mjs
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectEnv } from '../build.config.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deployDir = join(scriptDir, '..');
const root = join(deployDir, '..');
const webOut = join(deployDir, 'dist', 'web');
const clipitIconSrc = join(root, 'clipit', 'landing-page', 'public', 'icon.png');
const clipitIconPrepared = join(root, 'corporate-site', 'public', 'clipit-icon.png');

const corporateOnly = process.argv.includes('--corporate-only');

const jobs = [
  { name: 'corporate-site', cwd: join(root, 'corporate-site'), out: webOut, env: projectEnv['corporate-site'] },
  ...(corporateOnly
    ? []
    : [
        {
          name: 'clipit-landing',
          cwd: join(root, 'clipit', 'landing-page'),
          out: join(webOut, 'clipit'),
          env: projectEnv['clipit-landing'],
        },
      ]),
];

function run(cmd, cwd, env) {
  console.log(`\n> ${cmd}\n  (${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
}

mkdirSync(webOut, { recursive: true });
mkdirSync(join(webOut, 'clipit'), { recursive: true });

if (existsSync(clipitIconSrc)) {
  try {
    run('node scripts/prepare-clipit-icon.mjs', deployDir);
  } catch {
    console.warn('⚠ prepare-clipit-icon failed; using existing clipit-icon.png');
  }
}

const lpIcon = join(root, 'clipit', 'landing-page', 'public', 'icon.png');
if (existsSync(clipitIconPrepared)) {
  try {
    cpSync(clipitIconPrepared, lpIcon);
    console.log('✓ transparent icon -> clipit/landing-page/public/icon.png');
  } catch {
    console.warn('⚠ could not update LP icon.png (close file in IDE)');
  }
}

for (const job of jobs) {
  try {
    run('npm run build', job.cwd, job.env);
    mkdirSync(dirname(job.out), { recursive: true });
    cpSync(join(job.cwd, 'dist'), job.out, { recursive: true });
    console.log(`✓ ${job.name} -> ${job.out}`);
  } catch (err) {
    if (job.name === 'clipit-landing') {
      console.warn('⚠ clipit-landing build failed; patching existing dist/web/clipit');
      try {
        run('node scripts/patch-clipit-lp-dist.mjs', deployDir);
      } catch (patchErr) {
        throw err;
      }
    } else {
      throw err;
    }
  }
}

// コーポレート dist に含まれる透過版を優先（旧: LP の icon.png で上書きして黒背景が復活していた）
const iconForWeb = existsSync(clipitIconPrepared)
  ? clipitIconPrepared
  : join(deployDir, '.cache', 'clipit-icon-transparent.png');
if (existsSync(iconForWeb)) {
  cpSync(iconForWeb, join(webOut, 'clipit-icon.png'));
  const lpDeployedIcon = join(webOut, 'clipit', 'icon.png');
  if (existsSync(join(webOut, 'clipit'))) {
    cpSync(iconForWeb, lpDeployedIcon);
    console.log('✓ clipit/icon.png -> dist/web/clipit/ (transparent)');
  }
  console.log('✓ clipit-icon.png -> dist/web/ (transparent, from corporate-site/public)');
}

console.log('\nDone. Deploy: firebase deploy --project buzzit --config firebase.buzzit.json --only hosting:shigotoku-web');
