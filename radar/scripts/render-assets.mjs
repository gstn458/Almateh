/**
 * Renders the social preview image and the PNG app icons with the headless
 * Chromium that is already on this machine. Run it again whenever the brand
 * changes; the output is committed so a deploy never needs a browser.
 *
 *   node scripts/render-assets.mjs
 */
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'img');

const CHROME = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].find(existsSync);

if (!CHROME) {
  console.error('No Chromium found. The committed images in public/assets/img are already usable.');
  process.exit(0);
}

const FONT = '"Instrument Serif",Georgia,serif';

const cover = `<!doctype html><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Instrument+Serif&display=swap');
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#060809;color:#fff;font-family:Geist,Arial,sans-serif;overflow:hidden;position:relative}
  .grid{position:absolute;inset:0;opacity:.5;
    background-image:linear-gradient(rgba(74,222,128,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,.07) 1px,transparent 1px);
    background-size:70px 70px;
    -webkit-mask-image:radial-gradient(ellipse at 70% 40%,black,transparent 72%)}
  .bloom{position:absolute;right:-120px;top:-80px;width:760px;height:760px;border-radius:50%;
    background:radial-gradient(circle,rgba(74,222,128,.22),transparent 62%)}
  .inner{position:relative;padding:74px 80px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:16px;font-size:20px;letter-spacing:.3em;text-transform:uppercase}
  .mark{position:relative;width:30px;height:30px}
  .mark::before,.mark::after{content:"";position:absolute;left:50%;top:0;width:2px;height:100%;background:#4ADE80;transform:translateX(-50%) rotate(45deg)}
  .mark::after{transform:translateX(-50%) rotate(-45deg)}
  h1{font-family:${FONT};font-size:104px;line-height:.94;letter-spacing:-.04em;max-width:16ch;font-weight:400}
  h1 em{font-style:normal;color:#4ADE80}
  p{color:rgba(255,255,255,.58);font-size:25px;max-width:40ch;margin-top:26px;line-height:1.45}
  .foot{display:flex;gap:14px;flex-wrap:wrap}
  .chip{border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:11px 20px;font-size:17px;color:rgba(255,255,255,.72)}
</style>
<div class="grid"></div><div class="bloom"></div>
<div class="inner">
  <div class="brand"><span class="mark"></span>Radar</div>
  <div>
    <h1>Every opportunity you were <em>never told about</em>.</h1>
    <p>Verified competitions, research programmes, scholarships and fellowships — matched to you and tracked to the deadline.</p>
  </div>
  <div class="foot">
    <span class="chip">Matched with reasons</span>
    <span class="chip">Deadline tracking</span>
    <span class="chip">Free for students</span>
  </div>
</div>`;

const icon = (size) => `<!doctype html><meta charset="utf-8">
<style>
  *{margin:0}
  body{width:${size}px;height:${size}px;background:#060809;display:grid;place-items:center;overflow:hidden}
  .mark{position:relative;width:${size * 0.52}px;height:${size * 0.52}px}
  .mark::before,.mark::after{content:"";position:absolute;left:50%;top:0;width:${Math.max(2, size * 0.045)}px;height:100%;
    background:#4ADE80;border-radius:99px;transform:translateX(-50%) rotate(45deg)}
  .mark::after{transform:translateX(-50%) rotate(-45deg)}
  .dot{position:absolute;left:50%;top:50%;width:${size * 0.16}px;height:${size * 0.16}px;border-radius:50%;
    background:#4ADE80;transform:translate(-50%,-50%)}
</style>
<div class="mark"><span class="dot"></span></div>`;

const shots = [
  { name: 'og-cover.png', html: cover, size: '1200,630' },
  { name: 'icon-512.png', html: icon(512), size: '512,512' },
  { name: 'icon-192.png', html: icon(192), size: '192,192' },
  { name: 'icon-180.png', html: icon(180), size: '180,180' },
];

const dir = mkdtempSync(join(tmpdir(), 'radar-assets-'));

for (const shot of shots) {
  const page = join(dir, `${shot.name}.html`);
  writeFileSync(page, shot.html);
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${shot.size}`,
    `--screenshot=${join(OUT, shot.name)}`,
    `file://${page}`,
  ], { stdio: 'ignore', timeout: 60000 });
  console.log(`rendered ${shot.name}`);
}
