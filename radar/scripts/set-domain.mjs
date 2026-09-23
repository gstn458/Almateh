/**
 * Points Radar at its real domain.
 *
 * The origin appears in two places — the page builder writes it into canonical
 * links, Open Graph tags and the sitemap, and the browser config uses it for
 * share links and structured data. This sets both and rebuilds.
 *
 *   node scripts/set-domain.mjs https://radar.yourdomain.com
 *   node scripts/set-domain.mjs https://radar.yourdomain.com hello@yourdomain.com
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [origin, email] = process.argv.slice(2);

if (!origin || !/^https?:\/\/[^/\s]+$/.test(origin.replace(/\/$/, ''))) {
  console.error('Usage: node scripts/set-domain.mjs https://radar.example.com [contact@example.com]');
  process.exit(1);
}
const clean = origin.replace(/\/$/, '');

const edit = (relative, replacer) => {
  const file = join(ROOT, relative);
  const before = readFileSync(file, 'utf8');
  const after = replacer(before);
  if (before === after) {
    console.error(`Nothing to change in ${relative} — check it by hand.`);
    return;
  }
  writeFileSync(file, after);
  console.log(`updated ${relative}`);
};

edit('scripts/build-site.mjs', (s) => s.replace(/^const ORIGIN = '[^']*';$/m, `const ORIGIN = '${clean}';`));
edit('public/assets/js/config.js', (s) => s.replace(/(\n\s*origin: )'[^']*'/, `$1'${clean}'`));

if (email) {
  edit('public/assets/js/config.js', (s) => s.replace(/(\n\s*contactEmail: )(null|'[^']*')/, `$1'${email}'`));
}

execFileSync('node', [join(ROOT, 'scripts', 'build-site.mjs')], { stdio: 'inherit' });
console.log(`\nRadar now points at ${clean}. Commit the change and deploy.`);
