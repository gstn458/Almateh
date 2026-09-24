/**
 * Browser checks: console errors, horizontal overflow, touch-target size,
 * heading order, focus handling and the signed-in journey through the UI.
 *
 *   node server/index.js &
 *   node scripts/browser-test.mjs
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:4173';
const EXECUTABLE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const PAGES = [
  '/', '/opportunities.html', '/opportunity.html?id=regeneron-sts', '/how-it-works.html',
  '/about.html', '/verification.html', '/pricing.html', '/contact.html', '/report.html',
  '/privacy.html', '/terms.html', '/app/signup.html', '/app/login.html', '/404.html',
];

const VIEWPORTS = [
  { name: 'phone', width: 360, height: 740, isMobile: true },
  { name: 'tablet', width: 768, height: 1024, isMobile: true },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
];

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] });

/**
 * Google Fonts is not reachable from this sandbox, and a page must not depend
 * on it: the stylesheet is loaded non-blocking and the design falls back to
 * system fonts. Blocking it here keeps the run deterministic and proves the
 * fallback path works.
 */
const blockFonts = (context) => context.route('**://fonts.*/**', (route) => route.abort());

/* ------------------------------------------- every page, every viewport */
for (const viewport of VIEWPORTS) {
  console.log(`\n${viewport.name} (${viewport.width}px)`);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.isMobile,
    deviceScaleFactor: 2,
  });
  await blockFonts(context);

  for (const path of PAGES) {
    const page = await context.newPage();
    const errors = [];
    /* The blocked Google Fonts request is this harness, not the page. */
    const isFontBlock = (text) => /ERR_FAILED|fonts\.(googleapis|gstatic)/.test(text);
    page.on('console', (message) => {
      if (message.type() === 'error' && !isFontBlock(message.text())) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(BASE + path, { waitUntil: 'load' });
    await page.waitForTimeout(path === '/' ? 2800 : 700);

    const report = await page.evaluate(() => {
      const scrollable = document.documentElement.scrollWidth > window.innerWidth + 1;
      const overflowing = [...document.querySelectorAll('body *')]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && (rect.right > window.innerWidth + 2 || rect.left < -2);
        })
        .map((node) => `${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ')[0]}`)
        .filter((name, index, all) => all.indexOf(name) === index)
        .slice(0, 5);

      const small = [...document.querySelectorAll('a[href], button, input, select, textarea')]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          if (!rect.width || !rect.height || style.visibility === 'hidden') return false;
          /* Inline links in running text and inputs wrapped by their own
             label are exempt: the label is the target, and WCAG 2.2 excludes
             links inside a sentence. */
          if (node.closest('.site-footer, .prose, .breadcrumbs, .story-progress, .form-note, .field__hint, .lede, .checkbox, p')) return false;
          if (node.closest('label')) return false;
          /* A card's title anchor covers the whole card via ::after, so the
             real target is card-sized however tall the text line is. */
          if (node.closest('.opp__title, dd, .notice, .timeline')) return false;
          return rect.height < 36;
        })
        .map((node) => `${node.tagName.toLowerCase()}[${(node.textContent || '').trim().slice(0, 18)}]`)
        .slice(0, 5);

      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
      let skips = [];
      for (let i = 1; i < headings.length; i += 1) {
        if (headings[i] - headings[i - 1] > 1) skips.push(`${headings[i - 1]}→${headings[i]}`);
      }

      const unlabelled = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')]
        .filter((node) => !node.labels?.length && !node.getAttribute('aria-label') && !node.getAttribute('aria-labelledby'))
        .map((node) => node.name || node.id || node.tagName);

      const noAltImages = [...document.querySelectorAll('img')].filter((img) => img.alt === null || img.alt === undefined).length;

      return {
        scrollable,
        overflowing,
        small,
        skips,
        unlabelled,
        noAltImages,
        h1Count: headings.filter((level) => level === 1).length,
        title: document.title,
      };
    });

    const label = `${path}`;
    check(`${label} — no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    check(`${label} — no horizontal scroll`, !report.scrollable);
    check(`${label} — nothing overflows`, report.overflowing.length === 0, report.overflowing.join(', '));
    check(`${label} — exactly one h1`, report.h1Count === 1, `found ${report.h1Count}`);
    check(`${label} — heading order`, report.skips.length === 0, report.skips.join(', '));
    check(`${label} — inputs labelled`, report.unlabelled.length === 0, report.unlabelled.join(', '));
    if (viewport.isMobile) {
      check(`${label} — touch targets`, report.small.length === 0, report.small.join(', '));
    }
    await page.close();
  }
  await context.close();
}

/* ---------------------------------------- the hero's top-right stack */
console.log('\nHero chrome does not collide');
{
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['laptop', 1280, 720],
    ['short laptop', 1366, 640],
    ['wide', 1920, 1080],
    ['tablet', 820, 1180],
    ['phone', 390, 844],
    ['small phone', 360, 640],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await blockFonts(context);
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(2800);

    const collisions = await page.evaluate(() => {
      const names = ['.hero-account', '.hero-pill', '.story-audio', '.story-progress',
                     '.hero-brand', '.hero-nav', '.hero-actions', '.back-to-top'];
      const boxes = names.map((selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return null;
        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return { selector, ...rect.toJSON() };
      }).filter(Boolean);

      const hits = [];
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          const overlap = !(a.bottom <= b.top || b.bottom <= a.top || a.right <= b.left || b.right <= a.left);
          if (overlap) hits.push(`${a.selector} × ${b.selector}`);
        }
      }
      return hits;
    });

    check(`${name} — no overlapping hero chrome`, collisions.length === 0, collisions.join(', '));
    await page.close();
    await context.close();
  }
}

/* ------------------------------------------------ mobile menu behaviour */
console.log('\nMobile menu');
{
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true });
  await blockFonts(context);
  const page = await context.newPage();
  await page.goto(`${BASE}/opportunities.html`, { waitUntil: 'load' });
  await page.waitForSelector('.opp');

  await page.click('.nav-toggle');
  check('menu opens', await page.isVisible('#site-nav-panel.is-open'));
  check('focus moves into the menu', await page.evaluate(() => document.activeElement.closest('#site-nav-panel') !== null));

  await page.keyboard.press('Escape');
  check('escape closes the menu', !(await page.isVisible('#site-nav-panel.is-open')));
  check('focus returns to the button', await page.evaluate(() => document.activeElement.classList.contains('nav-toggle')));

  /* Tab should never escape an open menu. */
  await page.click('.nav-toggle');
  for (let i = 0; i < 14; i += 1) await page.keyboard.press('Tab');
  check('focus stays trapped', await page.evaluate(() => document.activeElement.closest('#site-nav-panel') !== null));
  await page.close();
  await context.close();
}

/* --------------------------------------------- the journey, in the UI */
console.log('\nSigned-in journey in the browser');
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await blockFonts(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const email = `ui-${Date.now()}@example.com`;
  await page.goto(`${BASE}/app/signup.html`, { waitUntil: 'load' });
  await page.fill('#name', 'UI Tester');
  await page.fill('#email', email);
  await page.fill('#password', 'a long enough passphrase');
  await page.check('[name="acceptedTerms"]');
  await page.click('#signup-form [type=submit]');
  await page.waitForURL('**/onboarding.html', { timeout: 10000 });
  check('signup lands on onboarding', page.url().includes('onboarding'));

  await page.click('#level-options label:has-text("High school")');
  await page.click('#onboard-next');
  await page.waitForTimeout(400);
  await page.click('#subject-options label:has-text("Research")');
  await page.click('#subject-options label:has-text("Physics")');
  await page.click('#onboard-next');
  await page.waitForTimeout(400);
  await page.click('#goal-options label:has-text("research career")');
  await page.click('#onboard-next');
  await page.waitForTimeout(400);
  await page.fill('#country', 'United Arab Emirates');
  await page.click('#onboard-next');
  await page.waitForTimeout(400);
  await page.click('#funding-options label:has-text("Essential")');
  await page.click('#experience-options label:has-text("Some projects")');
  await page.click('#onboard-next');
  await page.waitForTimeout(400);
  await page.click('#type-options label:has-text("Competitions")');
  await page.click('#onboard-next');
  await page.waitForURL('**/dashboard.html', { timeout: 10000 });
  check('onboarding completes to the dashboard', page.url().includes('dashboard'));

  await page.waitForSelector('#dashboard-matches .opp', { timeout: 10000 });
  const matchText = await page.textContent('#dashboard-matches');
  check('dashboard shows matches with reasons', /\d+% match\./.test(matchText), matchText.slice(0, 80));

  await page.goto(`${BASE}/opportunities.html`, { waitUntil: 'load' });
  await page.waitForSelector('.opp');
  await page.fill('#q', 'research');
  await page.waitForTimeout(700);
  const count = await page.textContent('#result-count');
  check('search updates the count', /\d+ of 44/.test(count), count);
  check('results are personalised', count.includes('scored against your profile'), count);

  await page.click('.opp .save-btn');
  await page.waitForTimeout(600);
  check('save toggles to saved', (await page.getAttribute('.opp .save-btn', 'aria-pressed')) === 'true');

  await page.goto(`${BASE}/opportunity.html?id=regeneron-sts`, { waitUntil: 'load' });
  await page.waitForSelector('#track-btn');
  check('detail page shows a countdown', (await page.textContent('.countdown')).length > 0);
  check('detail page explains the match', (await page.textContent('#opportunity-body')).includes('Why this matched'));
  await page.click('#track-btn');
  await page.waitForURL('**/tracker.html', { timeout: 10000 });
  await page.waitForSelector('[data-application]');
  check('tracker holds the application', (await page.locator('[data-application]').count()) === 1);

  await page.locator('details summary').first().click();
  await page.selectOption('[data-stage-select]', 'submitted');
  await page.waitForTimeout(700);
  check('stage change persists', (await page.textContent('.stage-badge')).includes('Submitted'));

  await page.goto(`${BASE}/app/calendar.html`, { waitUntil: 'load' });
  await page.waitForSelector('#calendar-upcoming');
  check('calendar lists the deadline', (await page.textContent('#calendar-upcoming')).includes('Regeneron'));

  await page.goto(`${BASE}/app/settings.html`, { waitUntil: 'load' });
  await page.waitForSelector('#profile-summary dl');
  check('settings shows the profile', (await page.textContent('#profile-summary')).includes('United Arab Emirates'));

  check('no uncaught errors in the journey', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
  await context.close();
}

/* ------------------------------------------------------ reduced motion */
console.log('\nReduced motion and no-JavaScript');
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await blockFonts(context);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  check('homepage still reveals with reduced motion', await page.isVisible('.word'));
  check('loader is removed', !(await page.isVisible('#page-loader')));
  await page.close();
  await context.close();

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  await blockFonts(noJs);
  const page2 = await noJs.newPage();
  await page2.goto(`${BASE}/opportunities.html`);
  check('navigation works without JavaScript', (await page2.locator('.site-nav a').count()) >= 5);
  check('page content is in the HTML', (await page2.textContent('h1')).includes('Find your signal'));
  await page2.goto(`${BASE}/privacy.html`);
  check('legal pages read without JavaScript', (await page2.textContent('.prose')).includes('Cookies'));
  await page2.close();
  await noJs.close();
}

await browser.close();
console.log(`\n${failures ? `${failures} FAILURES` : 'All browser checks passed.'}`);
process.exit(failures ? 1 : 0);
