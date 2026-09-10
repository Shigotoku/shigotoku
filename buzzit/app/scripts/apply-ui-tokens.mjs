/**
 * UTF-8 safe bulk UI token migration for BuzzIt app.
 * Run: node scripts/apply-ui-tokens.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('src');

const REPLACEMENTS = [
  [/bg-\[#f5f4f0\]/g, 'bg-neutral-50'],
  [/bg-\[var\(--color-buzz-paper\)\]/g, 'bg-[var(--color-buzz-paper)]'],
  [/sm:rounded-none/g, 'sm:rounded-2xl'],
  [
    /className="border border-neutral-200 bg-white p-8"/g,
    'className="buzz-auth-card"',
  ],
  [
    /className="border border-neutral-200 bg-white p-6"/g,
    'className="buzz-card-pad"',
  ],
  [
    /className="mx-auto min-h-dvh max-w-md border border-neutral-200 bg-white p-6"/g,
    'className="buzz-auth-card mx-auto min-h-dvh max-w-md"',
  ],
  [
    /className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900\/40 p-4"/g,
    'className="buzz-modal-overlay"',
  ],
  [
    /className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900\/50 p-4"/g,
    'className="buzz-modal-overlay"',
  ],
];

const SKIP_FILES = new Set(['PostPreview.tsx']);

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith('.tsx') && !SKIP_FILES.has(ent.name)) {
      let c = fs.readFileSync(p, 'utf8');
      const orig = c;
      for (const [re, rep] of REPLACEMENTS) c = c.replace(re, rep);
      if (c !== orig) {
        fs.writeFileSync(p, c, 'utf8');
        console.log('updated', path.relative(SRC, p));
      }
    }
  }
}

walk(SRC);
console.log('done');
