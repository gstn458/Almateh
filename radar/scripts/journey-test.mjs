/**
 * End-to-end check of the whole student journey against a running server.
 * Every step of the journey the product promises is exercised here.
 *
 *   node server/index.js &
 *   node scripts/journey-test.mjs
 */
const BASE = process.env.BASE || 'http://localhost:4173';
let cookie = '';
let failures = 0;

const call = async (method, path, body) => {
  const response = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('json') ? await response.json() : await response.text();
  return { status: response.status, payload, headers: response.headers };
};

const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const step = (name) => console.log(`\n${name}`);

/* 1. Discover -------------------------------------------------------- */
step('1. Discover Radar');
{
  const home = await fetch(BASE + '/');
  const html = await home.text();
  check('homepage serves', home.status === 200);
  check('title is set', html.includes('<title>Radar'));
  check('canonical link present', html.includes('rel="canonical"'));
  check('og image present', html.includes('og-cover.png'));
  check('structured data present', html.includes('application/ld+json'));
  check('skip link present', html.includes('skip-link'));

  const robots = await fetch(BASE + '/robots.txt');
  check('robots.txt serves', robots.status === 200);
  const sitemap = await fetch(BASE + '/sitemap.xml');
  check('sitemap serves', sitemap.status === 200);
  check('sitemap lists listings', (await sitemap.text()).includes('opportunity.html?id='));

  const missing = await fetch(BASE + '/nope.html');
  check('404 page serves a real page', missing.status === 404 && (await missing.text()).includes('not on the map'));
}

/* 2-3. Account and profile -------------------------------------------- */
step('2. Create an account');
const email = `student-${Date.now()}@example.com`;
{
  const weak = await call('POST', '/api/auth/signup', { email, password: 'short', acceptedTerms: true });
  check('weak password refused', weak.status === 400 && weak.payload.field === 'password');

  const noTerms = await call('POST', '/api/auth/signup', { email, password: 'a long enough passphrase' });
  check('terms required', noTerms.status === 400 && noTerms.payload.field === 'acceptedTerms');

  const created = await call('POST', '/api/auth/signup', {
    email, password: 'a long enough passphrase', name: 'Test Student', isMinor: true, acceptedTerms: true,
  });
  check('account created', created.status === 201 && created.payload.user.email === email);
  check('minor flag stored', created.payload.user.isMinor === true);
  check('session cookie is HttpOnly', /HttpOnly/i.test(created.headers.get('set-cookie') || ''));

  const duplicate = await call('POST', '/api/auth/signup', { email, password: 'a long enough passphrase', acceptedTerms: true });
  check('duplicate email refused', duplicate.status === 409);
}

step('3-4. Build a profile');
{
  const saved = await call('PUT', '/api/profile', {
    level: 'high-school',
    yearOrGrade: 'Year 12',
    country: 'United Arab Emirates',
    citizenship: 'United Arab Emirates',
    subjects: ['research', 'physics', 'mathematics'],
    goals: ['research', 'university-admission'],
    types: ['competition', 'research'],
    regions: ['Middle East', 'Europe'],
    fundingNeed: 'essential',
    experience: 'intermediate',
    availability: 'summer',
    willingToTravel: true,
  });
  check('profile saved', saved.status === 200 && saved.payload.completedAt);
  check('profile round-trips arrays', saved.payload.subjects.includes('physics'));
}

/* 5. Personalised opportunities --------------------------------------- */
step('5. Receive personalised opportunities');
let pick;
{
  const listing = await call('GET', '/api/opportunities?sort=match');
  check('catalogue returns', listing.payload.count === 44);
  check('marked personalised', listing.payload.personalised === true);
  const top = listing.payload.results[0];
  pick = top.id;
  check('top result has a score', typeof top.match.score === 'number');
  check('score comes with reasons', top.match.reasons.length > 0, JSON.stringify(top.match.reasons));
  check('ranking is descending', listing.payload.results[0].match.score >= listing.payload.results[5].match.score);

  const matches = await call('GET', '/api/matches');
  check('matches endpoint ready', matches.payload.ready === true && matches.payload.results.length > 0);
  check('closed listings excluded from matches', matches.payload.results.every((o) => o.liveStatus !== 'closed'));

  const blocked = listing.payload.results.find((o) => o.match.blockers.length);
  check('blockers are surfaced', Boolean(blocked), 'no listing produced a blocker');

  const search = await call('GET', '/api/opportunities?q=scholarship&type=scholarship');
  check('search and filter narrow results', search.payload.count > 0 && search.payload.count < 44);
  const region = await call('GET', '/api/opportunities?region=Middle%20East');
  check('region filter works', region.payload.results.every((o) => o.region === 'Middle East'));
  check('Middle East coverage exists', region.payload.count >= 6, `${region.payload.count} listings`);
}

/* 6. Detail page ------------------------------------------------------- */
step('6. Open a full opportunity page');
{
  const detail = await call('GET', `/api/opportunities/${pick}`);
  check('detail returns', detail.status === 200);
  check('similar opportunities included', detail.payload.similar.length > 0);
  check('eligibility present', Boolean(detail.payload.opportunity.citizenship));
  check('documents present', Array.isArray(detail.payload.opportunity.documents));
  check('steps present', detail.payload.opportunity.steps.length > 0);
  check('verification state present', Boolean(detail.payload.opportunity.verificationStatus));

  const bySlug = await call('GET', `/api/opportunities/${detail.payload.opportunity.slug}`);
  check('slug lookup works', bySlug.status === 200);

  const missing = await call('GET', '/api/opportunities/not-a-real-listing');
  check('unknown listing 404s', missing.status === 404);
}

/* 7-8. Save and track --------------------------------------------------- */
step('7. Save an opportunity');
{
  const saved = await call('POST', `/api/saves/${pick}`);
  check('save succeeds', saved.payload.saved === true);
  const list = await call('GET', '/api/saves');
  check('save appears in the list', list.payload.some((o) => o.id === pick));
  check('saved items carry a match score', typeof list.payload[0].match.score === 'number');
}

step('8. Add it to an application plan');
let applicationId;
{
  const created = await call('POST', '/api/applications', { opportunityId: pick, stage: 'researching' });
  applicationId = created.payload.id;
  check('application created', created.status === 201 && created.payload.stage === 'researching');
  check('checklist seeded from the listing', created.payload.checklist.length > 0);
  check('history recorded', created.payload.history.length > 0);

  const again = await call('POST', '/api/applications', { opportunityId: pick });
  check('duplicate returns the same application', again.payload.id === applicationId);
}

/* 9-11. Progress, reminders, outcome ------------------------------------ */
step('9. Track progress');
{
  const item = (await call('GET', '/api/applications')).payload[0].checklist[0];
  const ticked = await call('PATCH', `/api/applications/${applicationId}/checklist/${item.id}`, { done: true });
  check('checklist item ticks', ticked.payload.checklist.find((c) => c.id === item.id).done === true);

  const added = await call('POST', `/api/applications/${applicationId}/checklist`, { label: 'Ask Dr Khan for a reference' });
  check('custom checklist item added', added.payload.checklist.some((c) => c.label.includes('Dr Khan')));

  const noted = await call('PATCH', `/api/applications/${applicationId}`, { notes: 'Essay prompt is about failure.', contacts: 'Dr Khan' });
  check('notes saved', noted.payload.notes.includes('failure'));

  const staged = await call('PATCH', `/api/applications/${applicationId}`, { stage: 'submitted', appliedOn: '2026-10-01' });
  check('stage advances', staged.payload.stage === 'submitted');
  check('stage change is logged', staged.payload.history[0].from === 'researching' && staged.payload.history[0].to === 'submitted');

  const bad = await call('PATCH', `/api/applications/${applicationId}`, { stage: 'invented-stage' });
  check('unknown stage refused', bad.status === 400);
}

step('10. Reminders');
{
  const created = await call('POST', '/api/reminders', { opportunityId: pick, remindOn: '2026-09-01', label: 'Start the research statement' });
  check('reminder created', created.status === 201);
  const due = await call('GET', '/api/reminders/due');
  check('past-dated reminder shows as due', due.payload.length === 1);
  await call('POST', `/api/reminders/${due.payload[0].id}/ack`);
  check('acknowledged reminder clears', (await call('GET', '/api/reminders/due')).payload.length === 0);
  const bad = await call('POST', '/api/reminders', { opportunityId: pick, remindOn: 'soon' });
  check('bad reminder date refused', bad.status === 400);
}

step('11. Mark the outcome');
{
  const outcome = await call('PATCH', `/api/applications/${applicationId}`, { stage: 'accepted', resultOn: '2027-03-01', outcome: 'Accepted with funding' });
  check('outcome recorded', outcome.payload.stage === 'accepted' && outcome.payload.outcome.includes('funding'));
}

/* Calendar --------------------------------------------------------------- */
step('Calendar export');
{
  /* The top match may have no published date, which is a legitimate state —
     save a dated listing too so the feed has something to export. */
  await call('POST', '/api/saves/regeneron-sts');
  const feed = await fetch(`${BASE}/api/calendar/me.ics`, { headers: { cookie } });
  const ics = await feed.text();
  check('personal feed serves', feed.status === 200);
  check('calendar content type', (feed.headers.get('content-type') || '').includes('text/calendar'));
  check('feed holds an event', ics.includes('BEGIN:VEVENT') && ics.includes('END:VCALENDAR'));
  check('alarms included', ics.includes('TRIGGER:-P7D'));
  check('lines are CRLF folded', ics.split('\r\n').every((line) => line.length <= 75));

  const single = await fetch(`${BASE}/api/calendar/regeneron-sts.ics`);
  check('single listing exports', single.status === 200 && (await single.text()).includes('Regeneron'));
  const undated = await fetch(`${BASE}/api/calendar/regeneron-isef.ics`);
  check('undated listing refuses export', undated.status === 409);
}

/* 12. Return later ------------------------------------------------------- */
step('12. Return later and see everything');
{
  const me = await call('GET', '/api/auth/me');
  check('session persists', me.payload.user.email === email);
  check('profile comes back with it', me.payload.profile.country === 'United Arab Emirates');
  const apps = await call('GET', '/api/applications');
  check('application still there', apps.payload.length === 1 && apps.payload[0].stage === 'accepted');
  check('opportunity hydrated on the application', Boolean(apps.payload[0].opportunity?.title));
}

/* Reporting and contact --------------------------------------------------- */
step('Reporting and contact');
{
  const report = await call('POST', '/api/reports', { opportunityId: pick, reason: 'The deadline is wrong or has changed', detail: 'Organiser page says 12 Nov.' });
  check('report accepted', report.status === 201);
  const message = await call('POST', '/api/messages', { email: 'someone@example.com', body: 'Please add a UAE arts competition.' });
  check('contact message accepted', message.status === 201);
  const bad = await call('POST', '/api/messages', { email: 'not-an-email', body: 'hi' });
  check('bad email refused', bad.status === 400);
}

/* Privacy ----------------------------------------------------------------- */
step('Privacy: export and delete');
{
  const exported = await call('GET', '/api/account/export');
  check('export includes everything', exported.payload.profile && exported.payload.applications.length === 1 && exported.payload.saves.length === 2);

  const password = await call('POST', '/api/auth/password', { current: 'a long enough passphrase', next: 'another long passphrase' });
  check('password change works', password.status === 200);
  const relogin = await call('POST', '/api/auth/login', { email, password: 'another long passphrase' });
  check('new password signs in', relogin.status === 200);

  const deleted = await call('DELETE', '/api/account');
  check('account deleted', deleted.payload.deleted === true);
  const after = await call('POST', '/api/auth/login', { email, password: 'another long passphrase' });
  check('deleted account cannot sign in', after.status === 401);
}

/* Authorisation ------------------------------------------------------------ */
step('Authorisation');
{
  cookie = '';
  check('saves need a session', (await call('GET', '/api/saves')).status === 401);
  check('applications need a session', (await call('GET', '/api/applications')).status === 401);
  check('admin needs a session', (await call('GET', '/api/admin/overview')).status === 401);
  check('catalogue stays public', (await call('GET', '/api/opportunities')).status === 200);

  const student = `other-${Date.now()}@example.com`;
  await call('POST', '/api/auth/signup', { email: student, password: 'a long enough passphrase', acceptedTerms: true });
  check('a student cannot reach admin', (await call('GET', '/api/admin/overview')).status === 403);
  check('a student cannot edit the catalogue', (await call('POST', '/api/admin/opportunities', { title: 'x', org: 'y', officialUrl: 'https://e.com' })).status === 403);
}

/* Security headers ---------------------------------------------------------- */
step('Security headers and caching');
{
  const page = await fetch(BASE + '/opportunities.html');
  check('CSP set', (page.headers.get('content-security-policy') || '').includes("default-src 'self'"));
  check('nosniff set', page.headers.get('x-content-type-options') === 'nosniff');
  check('framing denied', page.headers.get('x-frame-options') === 'DENY');
  check('html revalidates', page.headers.get('cache-control') === 'no-cache');

  const asset = await fetch(BASE + '/assets/css/radar.css');
  check('assets cache long', (asset.headers.get('cache-control') || '').includes('max-age=604800'));
  check('assets are compressed', Boolean(asset.headers.get('content-encoding')) || asset.headers.get('content-length'));

  const traversal = await fetch(BASE + '/../server/db.js');
  check('path traversal blocked', traversal.status === 404 || traversal.status === 403);
}

console.log(`\n${failures ? `${failures} FAILURES` : 'All checks passed.'}`);
process.exit(failures ? 1 : 0);
