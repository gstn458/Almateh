/** Checks the administrative half of the product. */
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
  return { status: response.status, payload: await response.json().catch(() => null) };
};
const check = (label, ok, detail = '') => {
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('Administrator console');
const login = await call('POST', '/api/auth/login', { email: 'admin@radar.test', password: 'a long admin passphrase' });
check('admin signs in', login.status === 200 && login.payload.user.role === 'admin');

const overview = await call('GET', '/api/admin/overview');
check('overview returns counts', overview.payload.opportunities === 44);
check('stale listings surfaced', overview.payload.staleVerification.length > 0);
check('open reports counted', overview.payload.openReports >= 1);

const created = await call('POST', '/api/admin/opportunities', {
  title: 'Test UAE Design Prize', org: 'Radar Test', type: 'competition',
  officialUrl: 'https://example.com/prize', region: 'Middle East',
  summary: 'A test listing.', deadline: '2027-05-01',
});
check('admin adds a listing', created.status === 201, JSON.stringify(created.payload).slice(0, 120));
const id = created.payload?.id;

const duplicate = await call('POST', '/api/admin/opportunities', { title: 'Test UAE Design Prize', org: 'x', officialUrl: 'https://example.com' });
check('duplicate slug refused', duplicate.status === 409);

const edited = await call('PUT', `/api/admin/opportunities/${id}`, { summary: 'Edited summary.', deadline: '2027-06-01' });
check('admin edits a listing', edited.payload.summary === 'Edited summary.' && edited.payload.deadline === '2027-06-01');

const verified = await call('POST', `/api/admin/opportunities/${id}/verify`);
check('verification stamps a date', verified.payload.verificationStatus === 'verified' && Boolean(verified.payload.verifiedAt));

const publicView = await call('GET', `/api/opportunities/${id}`);
check('the edit reaches students', publicView.payload.opportunity.summary === 'Edited summary.');

const expired = await call('PUT', `/api/admin/opportunities/${id}`, { deadline: '2020-01-01' });
check('past deadline reads as closed', (await call('GET', `/api/opportunities/${id}`)).payload.opportunity.liveStatus === 'closed');

const pass = await call('POST', '/api/admin/expire-pass');
check('expiry pass marks listings', pass.payload.expired >= 1, JSON.stringify(pass.payload));

const reports = await call('GET', '/api/admin/reports');
check('reports are listed', reports.payload.length >= 1);
const resolved = await call('PATCH', `/api/admin/reports/${reports.payload[0].id}`, { status: 'resolved', resolution: 'Deadline corrected.' });
check('report can be resolved', resolved.status === 200);

const users = await call('GET', '/api/admin/users');
check('users are listed with counts', users.payload.length >= 1 && 'saves' in users.payload[0]);
check('user rows carry no profile answers', !JSON.stringify(users.payload).includes('subjects_json'));

const audit = await call('GET', '/api/admin/audit');
check('every change is audited', audit.payload.some((row) => row.action === 'opportunity.verify'));
check('audit records who did it', audit.payload[0].actor_email === 'admin@radar.test');

const removed = await call('DELETE', `/api/admin/opportunities/${id}`);
check('admin deletes a listing', removed.status === 200 && (await call('GET', `/api/opportunities/${id}`)).status === 404);

console.log(`\n${failures ? `${failures} FAILURES` : 'All admin checks passed.'}`);
process.exit(failures ? 1 : 0);
