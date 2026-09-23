/**
 * Exercises the Firebase backend's route logic against a fake SDK.
 *
 * A real Firebase project cannot be reached from CI, and the part worth
 * testing is not Google's client anyway — it is whether Radar's routes read
 * and write the right documents and answer in the same shape the other two
 * backends do. So the SDK is replaced with an in-memory stand-in that records
 * every document path it touches.
 *
 *   node scripts/firebase-test.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* The backend fetches the catalogue through local-backend; serve it locally. */
const catalogue = JSON.parse(readFileSync(join(ROOT, 'data', 'opportunities.json'), 'utf8'));
globalThis.fetch = async () => ({ ok: true, json: async () => catalogue });
globalThis.localStorage = {
  store: new Map(),
  getItem(k) { return this.store.get(k) ?? null; },
  setItem(k, v) { this.store.set(k, v); },
  removeItem(k) { this.store.delete(k); },
};

const backend = await import('../public/assets/js/firebase-backend.js');

/* ------------------------------------------------------------ the fake SDK */

const store = new Map();          // path -> data
const touched = [];
const pathOf = (ref) => ref.path;

const makeRef = (path) => ({ path, id: path.split('/').pop() });

let currentUser = null;
let authListener = null;

const fake = {
  auth: { get currentUser() { return currentUser; } },
  db: { name: 'fake' },

  onAuthStateChanged(auth, cb) { authListener = cb; cb(currentUser); return () => {}; },

  doc(...parts) {
    /* doc(db, 'users', uid) | doc(collectionRef) → a new id */
    if (parts[0]?.path && parts.length === 1) {
      return makeRef(`${parts[0].path}/gen-${store.size}-${Math.random().toString(36).slice(2, 8)}`);
    }
    return makeRef(parts.slice(1).join('/'));
  },
  collection(...parts) { return makeRef(parts.slice(1).join('/')); },

  async getDoc(ref) {
    touched.push(`get ${pathOf(ref)}`);
    const data = store.get(pathOf(ref));
    return { exists: () => data !== undefined, data: () => data };
  },
  async getDocs(ref) {
    touched.push(`list ${pathOf(ref)}`);
    const prefix = `${pathOf(ref)}/`;
    const docs = [...store.entries()]
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .map(([key, data]) => ({ id: key.split('/').pop(), ref: makeRef(key), data: () => data }));
    return { docs };
  },
  async setDoc(ref, data, options) {
    touched.push(`set ${pathOf(ref)}`);
    const existing = options?.merge ? store.get(pathOf(ref)) || {} : {};
    store.set(pathOf(ref), { ...existing, ...data });
  },
  async addDoc(ref, data) {
    const path = `${pathOf(ref)}/auto-${store.size}`;
    touched.push(`add ${path}`);
    store.set(path, data);
    return makeRef(path);
  },
  async deleteDoc(ref) { touched.push(`delete ${pathOf(ref)}`); store.delete(pathOf(ref)); },

  async createUserWithEmailAndPassword(auth, email, password) {
    if (!email.includes('@')) throw { code: 'auth/invalid-email' };
    if (password.length < 6) throw { code: 'auth/weak-password' };
    currentUser = {
      uid: 'uid-1', email, displayName: null,
      providerData: [{ providerId: 'password' }],
      metadata: { creationTime: '2026-09-23T00:00:00.000Z' },
    };
    return { user: currentUser };
  },
  async signInWithEmailAndPassword(auth, email, password) {
    if (password !== 'a long enough passphrase') throw { code: 'auth/invalid-credential' };
    currentUser = { uid: 'uid-1', email, displayName: null, providerData: [{ providerId: 'password' }], metadata: {} };
    return { user: currentUser };
  },
  async updateProfile(user, fields) { Object.assign(user, fields); },
  async signOut() { currentUser = null; authListener?.(null); },
  async deleteUser() { currentUser = null; },

  GoogleAuthProvider: class { setCustomParameters() {} },
  async signInWithPopup() {
    currentUser = {
      uid: 'uid-g', email: 'student@gmail.com', displayName: 'Google Student',
      providerData: [{ providerId: 'google.com' }], metadata: {},
    };
    return { user: currentUser };
  },
  async signInWithRedirect() { return undefined; },
  EmailAuthProvider: { credential: (email, password) => ({ email, password }) },
  async reauthenticateWithCredential(user, credential) {
    if (credential.password !== 'a long enough passphrase') throw { code: 'auth/wrong-password' };
  },
  async updatePassword() {},
};

backend.__setSdk(fake);

/* ---------------------------------------------------------------- harness */

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};
const call = (method, path, options) => backend.handle(method, path, options || {});
const expectError = async (label, status, fn) => {
  try {
    await fn();
    check(label, false, 'no error thrown');
  } catch (error) {
    check(label, error.status === status, `status ${error.status}: ${error.message}`);
  }
};

/* ------------------------------------------------------------------ tests */

console.log('Signed out');
{
  const me = await call('GET', '/api/auth/me');
  check('no session reports no user', me.user === null);
  const listing = await call('GET', '/api/opportunities', { query: {} });
  check('catalogue is public', listing.count === 44);
  check('unpersonalised without a profile', listing.personalised === false);
  await expectError('saves need a session', 401, () => call('GET', '/api/saves'));
  await expectError('admin is refused', 503, () => call('GET', '/api/admin/overview'));
}

console.log('\nEmail sign-up');
{
  await expectError('terms are required', 400, () =>
    call('POST', '/api/auth/signup', { body: { email: 'a@b.com', password: 'a long enough passphrase' } }));
  await expectError('short passwords refused', 400, () =>
    call('POST', '/api/auth/signup', { body: { email: 'a@b.com', password: 'short', acceptedTerms: true } }));

  const created = await call('POST', '/api/auth/signup', {
    body: { email: 'a@b.com', password: 'a long enough passphrase', name: 'Test', isMinor: true, acceptedTerms: true },
  });
  check('account created', created.user.email === 'a@b.com');
  check('minor flag stored', created.user.isMinor === true);
  check('profile document written', store.has('users/uid-1'));
  check('display name set', created.user.name === 'Test');
}

console.log('\nProfile and matching');
{
  const saved = await call('PUT', '/api/profile', {
    body: {
      level: 'high-school', country: 'United Arab Emirates', citizenship: 'United Arab Emirates',
      subjects: ['research', 'physics'], goals: ['research'], types: ['competition'],
      regions: ['Middle East'], fundingNeed: 'essential', experience: 'intermediate',
    },
  });
  check('profile saved', Boolean(saved.completedAt));
  check('profile holds only profile fields', !('email' in saved) && !('isMinor' in saved));

  const listing = await call('GET', '/api/opportunities', { query: { sort: 'match' } });
  check('results are personalised', listing.personalised === true);
  check('top result carries a score', typeof listing.results[0].match.score === 'number');
  check('score carries its reasons', listing.results[0].match.reasons.length > 0);

  const matches = await call('GET', '/api/matches');
  check('matches ready', matches.ready === true && matches.results.length > 0);
  check('closed listings excluded', matches.results.every((o) => o.liveStatus !== 'closed'));
}

console.log('\nSaves, tracker, reminders');
let applicationId;
{
  await call('POST', '/api/saves/regeneron-sts');
  const saves = await call('GET', '/api/saves');
  check('save round-trips', saves.length === 1 && saves[0].id === 'regeneron-sts');
  check('saved under the user', store.has('users/uid-1/saves/regeneron-sts'));

  const created = await call('POST', '/api/applications', { body: { opportunityId: 'regeneron-sts', stage: 'researching' } });
  applicationId = created.id;
  check('application created', created.stage === 'researching');
  check('checklist seeded from the listing', created.checklist.length > 0);
  check('history recorded', created.history.length === 1);
  check('opportunity hydrated', created.opportunity.title.includes('Regeneron'));

  const again = await call('POST', '/api/applications', { body: { opportunityId: 'regeneron-sts' } });
  check('duplicate returns the same application', again.id === applicationId);

  const item = created.checklist[0];
  const ticked = await call('PATCH', `/api/applications/${applicationId}/checklist/${item.id}`, { body: { done: true } });
  check('checklist item ticks', ticked.checklist.find((c) => c.id === item.id).done === true);

  const added = await call('POST', `/api/applications/${applicationId}/checklist`, { body: { label: 'Ask for a reference' } });
  check('checklist item added', added.checklist.some((c) => c.label === 'Ask for a reference'));

  const staged = await call('PATCH', `/api/applications/${applicationId}`, { body: { stage: 'submitted', notes: 'Sent it.' } });
  check('stage advances', staged.stage === 'submitted');
  check('stage change logged', staged.history[0].from === 'researching' && staged.history[0].to === 'submitted');
  check('notes saved', staged.notes === 'Sent it.');

  await expectError('reminder needs a real date', 400, () =>
    call('POST', '/api/reminders', { body: { opportunityId: 'regeneron-sts', remindOn: 'soon' } }));
  const reminder = await call('POST', '/api/reminders', {
    body: { opportunityId: 'regeneron-sts', remindOn: '2026-09-01', label: 'Start the essay' },
  });
  const due = await call('GET', '/api/reminders/due');
  check('past reminder is due', due.length === 1 && due[0].label === 'Start the essay');
  await call('POST', `/api/reminders/${reminder.id}/ack`);
  check('acknowledged reminder clears', (await call('GET', '/api/reminders/due')).length === 0);

  const detail = await call('GET', '/api/opportunities/regeneron-sts');
  check('detail knows it is saved', detail.saved === true);
  check('detail links the application', detail.application?.id === applicationId);
  check('similar listings returned', detail.similar.length > 0);
}

console.log('\nPublic write-only collections');
{
  const report = await call('POST', '/api/reports', {
    body: { opportunityId: 'regeneron-sts', reason: 'The deadline is wrong or has changed', detail: 'Says 12 Nov.' },
  });
  check('report accepted', report.received === true);
  check('report written to its own collection', [...store.keys()].some((k) => k.startsWith('reports/')));

  await expectError('bad contact email refused', 400, () =>
    call('POST', '/api/messages', { body: { email: 'nope', body: 'hi' } }));
  const message = await call('POST', '/api/messages', { body: { email: 'me@example.com', body: 'Please add a UAE prize.' } });
  check('contact message accepted', message.received === true);

  const analytics = await call('POST', '/api/analytics', { body: { name: 'search' } });
  check('analytics writes nothing', analytics.counted === false);
}

console.log('\nPassword change');
{
  await expectError('wrong current password refused', 401, () =>
    call('POST', '/api/auth/password', { body: { current: 'wrong', next: 'another long passphrase' } }));
  const changed = await call('POST', '/api/auth/password', {
    body: { current: 'a long enough passphrase', next: 'another long passphrase' },
  });
  check('password changed', changed.ok === true);
}

console.log('\nExport and delete');
{
  const exported = await call('GET', '/api/account/export');
  check('export carries everything', exported.profile.level === 'high-school'
    && exported.saves.length === 1 && exported.applications.length === 1);

  await call('DELETE', '/api/account');
  check('user documents removed', ![...store.keys()].some((k) => k.startsWith('users/uid-1')));
  check('reports survive deletion', [...store.keys()].some((k) => k.startsWith('reports/')));
  check('signed out afterwards', (await call('GET', '/api/auth/me')).user === null);
}

console.log('\nGoogle sign-in');
{
  const result = await call('POST', '/api/auth/google');
  check('google account signed in', result.user.email === 'student@gmail.com');
  check('provider recorded', result.user.provider === 'google.com');
  check('name taken from Google', result.user.name === 'Google Student');
  check('profile document created', store.has('users/uid-g'));

  await call('PUT', '/api/profile', { body: { level: 'undergraduate', country: 'United Arab Emirates', subjects: ['research'] } });
  const me = await call('GET', '/api/auth/me');
  check('profile persists for the google account', me.profile.level === 'undergraduate');

  await expectError('google accounts have no radar password', 400, () =>
    call('POST', '/api/auth/password', { body: { current: 'x', next: 'another long passphrase' } }));
}

console.log('\nDocument paths');
{
  const outside = touched.filter((entry) => {
    const path = entry.split(' ')[1];
    return !path.startsWith('users/') && !path.startsWith('reports/') && !path.startsWith('messages/');
  });
  check('nothing is written outside users/, reports/ and messages/', outside.length === 0, outside.join(', '));
  check('every user path is under a uid', touched
    .filter((e) => e.split(' ')[1].startsWith('users/'))
    .every((e) => /^users\/uid-[\w-]+/.test(e.split(' ')[1])));
}

console.log(`\n${failures ? `${failures} FAILURES` : 'All Firebase checks passed.'}`);
process.exit(failures ? 1 : 0);
