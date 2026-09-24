/**
 * Static site builder.
 *
 * Page bodies live in pages/, the shared chrome lives here, and the output is
 * plain HTML in public/. Nothing is assembled in the browser, so navigation,
 * headings and content are all present with JavaScript switched off — which is
 * what search engines and screen readers see too.
 *
 *   node scripts/build-site.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = join(ROOT, 'pages');
const JS_SRC = join(ROOT, 'src', 'js');
const OUT = join(ROOT, 'public');
const JS_OUT = join(OUT, 'assets', 'js');

const VERSION = buildId();

/**
 * Every asset URL carries this, and it changes whenever any script does.
 *
 * The scripts keep their filenames between deploys, so without it a browser
 * that has the site cached keeps running old code — including, once, a copy
 * that still believed Firebase was switched off. A version on the URL makes an
 * updated file a different URL, which no cache can confuse with the old one.
 */
function buildId() {
  const hash = createHash('sha256');
  for (const file of readdirSync(JS_SRC).sort()) {
    if (file === 'build.js') continue;   // holds the previous id
    if (file.endsWith('.js')) hash.update(readFileSync(join(JS_SRC, file)));
  }
  for (const file of readdirSync(join(OUT, 'assets', 'css')).sort()) {
    if (file.endsWith('.css')) hash.update(readFileSync(join(OUT, 'assets', 'css', file)));
  }
  return hash.digest('hex').slice(0, 10);
}

const SITE_NAME = 'Radar';
const ORIGIN = 'https://radar.example.com';
const DESCRIPTION = 'Radar finds the competitions, research programmes, scholarships and fellowships students are never told about — verified, matched to you, and tracked to the deadline.';

/** Per-page metadata. Anything not listed here inherits the defaults. */
const META = {
  'index.html': {
    title: 'Radar — Every opportunity you were never told about',
    description: DESCRIPTION,
    layout: 'hero',
    priority: '1.0',
  },
  'how-it-works.html': {
    title: 'How Radar works',
    description: 'Build a profile, get matched with reasons you can read, track every deadline in one place. Here is exactly what Radar does and what it does not do.',
  },
  'opportunities.html': {
    title: 'Opportunity directory',
    description: 'Search verified competitions, research programmes, scholarships and fellowships. Filter by level, region, funding and deadline.',
    priority: '0.9',
  },
  'opportunity.html': {
    title: 'Opportunity',
    description: 'Full details for one opportunity: eligibility, funding, documents, application steps, deadline and the official source.',
    noindex: true,
  },
  'about.html': { title: 'About Radar', description: 'Why Radar exists, who builds it, and the standard every listing has to meet.' },
  'verification.html': { title: 'Verification policy', description: 'How Radar checks sources, confirms deadlines, tests links, and what each verification badge actually means.' },
  'pricing.html': { title: 'Pricing and access', description: 'Radar is free for students. Here is what is available today and what is still being built.' },
  'contact.html': { title: 'Contact Radar', description: 'Ask a question, suggest an opportunity, or report a problem with a listing.' },
  'report.html': { title: 'Report an inaccurate listing', description: 'Tell Radar when a deadline, link or eligibility rule is wrong. Every report is reviewed.' },
  'privacy.html': { title: 'Privacy policy', description: 'What Radar collects, why, how long it is kept, and how to export or delete everything.' },
  'terms.html': { title: 'Terms of use', description: 'The terms that apply to using Radar, including what Radar does not guarantee.' },
  '404.html': { title: 'Page not found', description: 'That page does not exist.', noindex: true, exclude: true },

  'app/signup.html': { title: 'Create your Radar account', description: 'Create a free Radar account to save opportunities, track applications and set deadline reminders.' },
  'app/login.html': { title: 'Sign in to Radar', description: 'Sign in to your Radar account.' },
  'app/onboarding.html': { title: 'Build your profile', description: 'Six short steps that teach Radar what to match you with.', noindex: true },
  'app/dashboard.html': { title: 'Your dashboard', description: 'Your matches, deadlines and application progress in one place.', noindex: true, app: true },
  'app/saved.html': { title: 'Saved opportunities', description: 'Everything you have saved.', noindex: true, app: true },
  'app/tracker.html': { title: 'Application tracker', description: 'Track every application from saved through to the outcome.', noindex: true, app: true },
  'app/calendar.html': { title: 'Deadline calendar', description: 'Every deadline you are tracking, with reminders and calendar export.', noindex: true, app: true },
  'app/settings.html': { title: 'Account settings', description: 'Your profile, preferences, data export and account deletion.', noindex: true, app: true },
  'app/diagnostics.html': { title: 'Diagnostics', description: 'What this browser is running, and what Firebase actually returned.', noindex: true, exclude: true },

  'admin/index.html': { title: 'Radar admin', description: 'Administrator console.', noindex: true, exclude: true, admin: true },
  'admin/opportunities.html': { title: 'Catalogue — Radar admin', description: 'Add, edit, verify and expire listings.', noindex: true, exclude: true, admin: true },
  'admin/reports.html': { title: 'Reports — Radar admin', description: 'Student reports and contact messages.', noindex: true, exclude: true, admin: true },
  'admin/users.html': { title: 'Users — Radar admin', description: 'Accounts and activity.', noindex: true, exclude: true, admin: true },
  'admin/links.html': { title: 'Link checks — Radar admin', description: 'Automated link checking across the catalogue.', noindex: true, exclude: true, admin: true },
};

const NAV = [
  ['/opportunities.html', 'Opportunities'],
  ['/how-it-works.html', 'How it works'],
  ['/verification.html', 'Verification'],
  ['/pricing.html', 'Pricing'],
  ['/about.html', 'About'],
];

const APP_NAV = [
  ['/app/dashboard.html', 'Dashboard'],
  ['/app/saved.html', 'Saved'],
  ['/app/tracker.html', 'Tracker'],
  ['/app/calendar.html', 'Calendar'],
  ['/app/settings.html', 'Settings'],
];

const ADMIN_NAV = [
  ['/admin/index.html', 'Overview'],
  ['/admin/opportunities.html', 'Catalogue'],
  ['/admin/reports.html', 'Reports'],
  ['/admin/users.html', 'Users'],
  ['/admin/links.html', 'Link checks'],
];

const header = () => `
  <header class="site-header">
    <div class="site-header__inner">
      <a class="brandmark" href="/"><span class="brandmark__mark" aria-hidden="true"></span>${SITE_NAME}</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav-panel">
        <span class="sr-only">Menu</span><i aria-hidden="true"></i><i aria-hidden="true"></i>
      </button>
      <div class="site-header__nav" id="site-nav-panel">
        <nav class="site-nav" aria-label="Main">
          ${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('\n          ')}
        </nav>
        <div class="site-header__actions">
          <a class="btn btn--quiet" href="/app/login.html" data-when="signed-out" hidden>Sign in</a>
          <a class="btn btn--primary btn--sm" href="/app/signup.html" data-when="signed-out" hidden>Create account</a>
          <a class="btn btn--ghost btn--sm" href="/app/dashboard.html" data-when="signed-in" hidden>Dashboard</a>
        </div>
      </div>
    </div>
  </header>`;

const appSidebar = (nav, label) => `
      <nav class="app-side" aria-label="${label}">
        <ul>
          ${nav.map(([href, text]) => `<li><a href="${href}">${text}</a></li>`).join('\n          ')}
        </ul>
      </nav>`;

const footer = () => `
  <footer class="site-footer">
    <div class="wrap">
      <div class="site-footer__grid">
        <div>
          <a class="brandmark" href="/"><span class="brandmark__mark" aria-hidden="true"></span>${SITE_NAME}</a>
          <p class="site-footer__note">A verified directory and application tracker for students. Built in Dubai.</p>
          <p class="site-footer__note"><strong>Radar is not the organiser.</strong> Every deadline, rule and decision belongs to the organisation running the opportunity.</p>
        </div>
        <div>
          <h2>Product</h2>
          <ul>
            <li><a href="/opportunities.html">Opportunity directory</a></li>
            <li><a href="/how-it-works.html">How Radar works</a></li>
            <li><a href="/pricing.html">Pricing and access</a></li>
            <li><a href="/app/signup.html">Create an account</a></li>
          </ul>
        </div>
        <div>
          <h2>Trust</h2>
          <ul>
            <li><a href="/verification.html">Verification policy</a></li>
            <li><a href="/report.html">Report a listing</a></li>
            <li><a href="/privacy.html">Privacy policy</a></li>
            <li><a href="/terms.html">Terms of use</a></li>
          </ul>
        </div>
        <div>
          <h2>Radar</h2>
          <ul>
            <li><a href="/about.html">About</a></li>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/app/settings.html">Your data</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__bottom">
        <span>&copy; <span id="year">2026</span> ${SITE_NAME}</span>
        <span>Deadlines shown are the organiser's. Confirm before you apply.</span>
      </div>
    </div>
  </footer>`;

/** Structured data: tells search engines what kind of page this is. */
function jsonLd(file, meta) {
  const graph = [{
    '@type': 'WebSite',
    '@id': `${ORIGIN}/#website`,
    name: SITE_NAME,
    url: ORIGIN,
    description: DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${ORIGIN}/opportunities.html?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }, {
    '@type': 'Organization',
    '@id': `${ORIGIN}/#organization`,
    name: SITE_NAME,
    url: ORIGIN,
    description: 'A verified opportunity directory and application tracker for students.',
    foundingLocation: { '@type': 'Place', name: 'Dubai, United Arab Emirates' },
  }];

  if (file !== 'index.html') {
    graph.push({
      '@type': 'WebPage',
      '@id': `${ORIGIN}/${file}#page`,
      url: `${ORIGIN}/${file}`,
      name: meta.title,
      description: meta.description,
      isPartOf: { '@id': `${ORIGIN}/#website` },
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

function layout(file, meta, body) {
  const title = file === 'index.html' ? meta.title : `${meta.title} — ${SITE_NAME}`;
  const canonical = `${ORIGIN}/${file === 'index.html' ? '' : file}`;
  const depth = file.split('/').length - 1;
  const up = depth ? '../'.repeat(depth) : '';

  const chrome = meta.layout === 'hero' ? '' : header();
  const main = meta.app
    ? `<div class="app-shell">${appSidebar(APP_NAV, 'Your Radar')}<div class="app-main" id="main-content" tabindex="-1">${body}</div></div>`
    : meta.admin
      ? `<div class="app-shell">${appSidebar(ADMIN_NAV, 'Admin')}<div class="app-main" id="main-content" tabindex="-1">${body}</div></div>`
      : `<main class="page__main" id="main-content" tabindex="-1">${body}</main>`;

  return `<!doctype html>
<html lang="en"${meta.layout === 'hero' ? ' class="anim is-loading"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#060809">
<title>${title}</title>
<meta name="description" content="${meta.description}">
${meta.noindex ? '<meta name="robots" content="noindex, follow">\n' : ''}<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ORIGIN}/assets/img/og-cover.png">
<meta property="og:image:alt" content="Radar — every opportunity you were never told about">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${meta.description}">
<meta name="twitter:image" content="${ORIGIN}/assets/img/og-cover.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap"></noscript>
<link rel="stylesheet" href="/assets/css/radar.css?v=${VERSION}">
${meta.css ? meta.css.map((href) => `<link rel="stylesheet" href="${href}?v=${VERSION}">`).join('\n') : ''}
<script type="application/ld+json">${jsonLd(file, meta)}</script>
</head>
<body class="page">
<a class="skip-link" href="#main-content">Skip to content</a>
${chrome}
${main}
${footer()}
<script type="module" src="/assets/js/ui.js?v=${VERSION}"></script>
${(meta.scripts || []).map((src) => `<script type="module" src="${src}?v=${VERSION}"></script>`).join('\n')}
</body>
</html>
`.replace(/\n{3,}/g, '\n\n');
}

/* Pages that pull in their own behaviour. */
const SCRIPTS = {
  'index.html': ['/assets/js/home.js'],
  'opportunities.html': ['/assets/js/directory.js'],
  'opportunity.html': ['/assets/js/opportunity.js'],
  'report.html': ['/assets/js/forms.js'],
  'contact.html': ['/assets/js/forms.js'],
  'pricing.html': ['/assets/js/forms.js'],
  'app/signup.html': ['/assets/js/auth.js'],
  'app/login.html': ['/assets/js/auth.js'],
  'app/onboarding.html': ['/assets/js/onboarding.js'],
  'app/dashboard.html': ['/assets/js/dashboard.js'],
  'app/saved.html': ['/assets/js/saved.js'],
  'app/tracker.html': ['/assets/js/tracker.js'],
  'app/calendar.html': ['/assets/js/calendar.js'],
  'app/settings.html': ['/assets/js/settings.js'],
  'app/diagnostics.html': ['/assets/js/diagnostics.js'],
  'admin/index.html': ['/assets/js/admin.js'],
  'admin/opportunities.html': ['/assets/js/admin.js'],
  'admin/reports.html': ['/assets/js/admin.js'],
  'admin/users.html': ['/assets/js/admin.js'],
  'admin/links.html': ['/assets/js/admin.js'],
};

function walk(dir, base = '') {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) found.push(...walk(full, rel));
    else if (entry.endsWith('.html')) found.push(rel);
  }
  return found;
}

mkdirSync(JS_OUT, { recursive: true });

/* The build id, readable by the app itself — the diagnostics page reports it. */
writeFileSync(join(JS_SRC, 'build.js'),
  `/* Written by scripts/build-site.mjs. Do not edit. */\nexport const BUILD = ${JSON.stringify({ id: VERSION, builtAt: new Date().toISOString().slice(0, 16).replace('T', ' ') })};\n`);

let scriptCount = 0;
for (const file of readdirSync(JS_SRC)) {
  if (!file.endsWith('.js')) continue;
  const source = readFileSync(join(JS_SRC, file), 'utf8');
  /* Rewrites `from './x.js'` and `import('./x.js')`, and nothing else: every
     specifier in this codebase is a plain relative path. */
  const versioned = source.replace(
    /(\bfrom\s*|\bimport\s*\()(['"])(\.\.?\/[^'"]+?\.js)\2/g,
    (_, keyword, quote, path) => `${keyword}${quote}${path}?v=${VERSION}${quote}`,
  );
  writeFileSync(join(JS_OUT, file), versioned);
  scriptCount += 1;
}

const files = walk(PAGES).sort();
const built = [];

for (const file of files) {
  const meta = {
    title: file.replace(/\.html$/, ''),
    description: DESCRIPTION,
    ...META[file],
    scripts: SCRIPTS[file] || [],
    css: file === 'index.html' ? ['/assets/css/hero.css'] : [],
  };
  const body = readFileSync(join(PAGES, file), 'utf8');
  const target = join(OUT, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, layout(file, meta, body));
  built.push({ file, meta });
}

/* The catalogue is published alongside the pages so the site still works on
   static hosting, where there is no API to ask. data/ also holds the database,
   which must never be copied out. */
mkdirSync(join(OUT, 'data'), { recursive: true });
copyFileSync(join(ROOT, 'data', 'opportunities.json'), join(OUT, 'data', 'opportunities.json'));

/* ------------------------------------------------------------- sitemap */
const today = new Date().toISOString().slice(0, 10);
const urls = built
  .filter(({ meta }) => !meta.exclude && !meta.noindex)
  .map(({ file, meta }) => `  <url>
    <loc>${ORIGIN}/${file === 'index.html' ? '' : file}</loc>
    <lastmod>${today}</lastmod>
    <priority>${meta.priority || '0.7'}</priority>
  </url>`);

/* Every listing gets a crawlable URL of its own. */
const catalogue = JSON.parse(readFileSync(join(ROOT, 'data', 'opportunities.json'), 'utf8'));
for (const o of catalogue) {
  urls.push(`  <url>
    <loc>${ORIGIN}/opportunity.html?id=${o.id}</loc>
    <lastmod>${o.verifiedAt || today}</lastmod>
    <priority>0.6</priority>
  </url>`);
}

writeFileSync(join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap s.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
    .replace('sitemap s', 'sitemaps'));

writeFileSync(join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /app/dashboard.html\nDisallow: /app/saved.html\nDisallow: /app/tracker.html\nDisallow: /app/calendar.html\nDisallow: /app/settings.html\nDisallow: /app/onboarding.html\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

console.log(`built ${built.length} pages, ${scriptCount} scripts, ${urls.length} sitemap entries — build ${VERSION}`);
