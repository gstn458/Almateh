/**
 * The Firebase half of the data layer.
 *
 * Answers the same routes the Node API and the in-browser backend answer, but
 * against Firebase Auth and Firestore. That is what makes accounts real on a
 * static deploy: there is no server to run, yet a student signs in on their
 * phone and finds what they saved on a school computer.
 *
 * The catalogue still comes from the published JSON — it is the same file for
 * everyone and costs nothing to serve from the edge, so there is no reason to
 * bill a Firestore read for it. Only what belongs to a person lives in
 * Firestore, under `users/{uid}`, and firestore.rules keeps it there.
 */
import { FIREBASE } from './firebase-config.js';
import { loadCatalogue, handle as localHandle } from './local-backend.js';
import { rankOpportunities, scoreOpportunity, similarOpportunities, deriveStatus } from './matching.js';

class FirebaseError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

/* ------------------------------------------------------------- SDK loading */

let sdk = null;
let sdkPromise = null;

/** Tests inject a fake SDK here so the route logic can be exercised offline. */
export function __setSdk(fake) {
  sdk = fake;
  sdkPromise = fake ? Promise.resolve(fake) : null;
}

/**
 * Pulls the modular SDK from Google's CDN the first time it is needed, so a
 * visitor who only reads the directory never downloads it.
 */
function loadSdk() {
  if (sdkPromise) return sdkPromise;
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE.sdkVersion}`;
  sdkPromise = Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]).then(([app, auth, firestore]) => {
    const instance = app.initializeApp(FIREBASE.config);
    sdk = {
      ...auth,
      ...firestore,
      auth: auth.getAuth(instance),
      db: firestore.getFirestore(instance),
    };
    return sdk;
  }).catch(() => {
    sdkPromise = null;
    throw new FirebaseError(503, 'Could not reach Firebase. Check your connection and try again.');
  });
  return sdkPromise;
}

/* ------------------------------------------------------------- auth state */

let authReady = null;
let redirectChecked = false;

/**
 * Finishes a sign-in that used the redirect flow.
 *
 * The person left for Google and came back to whatever page they started on,
 * so every session lookup has to give Firebase a chance to hand over the
 * result before deciding nobody is signed in.
 */
async function completeRedirect(s) {
  if (redirectChecked) return null;
  redirectChecked = true;
  try {
    const credential = await s.getRedirectResult(s.auth);
    if (!credential?.user) return null;
    const existing = await readProfile(s, credential.user.uid);
    const profile = {
      ...existing,
      name: existing.name || credential.user.displayName || '',
      email: credential.user.email,
      createdAt: existing.createdAt || now(),
      updatedAt: now(),
    };
    await s.setDoc(userDoc(s, credential.user.uid), profile, { merge: true });
    return credential.user;
  } catch {
    /* No pending redirect, or it failed. Either way, carry on as signed out. */
    return null;
  }
}

/**
 * Resolves once Firebase has restored (or ruled out) a previous session.
 *
 * The listener can fire before `onAuthStateChanged` has returned its
 * unsubscribe function, so the unsubscribe is called defensively rather than
 * from inside the callback.
 */
function currentUser() {
  authReady ||= loadSdk().then((s) => new Promise((resolve) => {
    let stop = null;
    let settled = false;
    const finish = (user) => {
      if (settled) return;
      settled = true;
      resolve(user);
      stop?.();
    };
    stop = s.onAuthStateChanged(s.auth, finish);
    if (settled) stop?.();
  }));
  return loadSdk().then((s) => s.auth.currentUser || authReady);
}

const requireUser = async () => {
  const user = await currentUser();
  if (!user) throw new FirebaseError(401, 'Sign in to continue.');
  return user;
};

const now = () => new Date().toISOString();

const publicUser = (user, profileDoc = {}) => ({
  id: user.uid,
  email: user.email || '',
  name: user.displayName || profileDoc.name || '',
  role: 'student',
  isMinor: Boolean(profileDoc.isMinor),
  emailOptIn: Boolean(profileDoc.emailOptIn),
  createdAt: profileDoc.createdAt || user.metadata?.creationTime || now(),
  provider: user.providerData?.[0]?.providerId || 'password',
});

/** Firebase's error codes, turned into something a student can act on. */
function translate(error) {
  const code = String(error?.code || '');
  const map = {
    'auth/invalid-email': [400, 'Enter a valid email address.', 'email'],
    'auth/missing-password': [400, 'Enter your password.', 'password'],
    'auth/weak-password': [400, 'Use at least 10 characters — length matters more than symbols.', 'password'],
    'auth/email-already-in-use': [409, 'An account already exists for that email.', 'email'],
    'auth/invalid-credential': [401, 'That email and password do not match.'],
    'auth/wrong-password': [401, 'That email and password do not match.'],
    'auth/user-not-found': [401, 'That email and password do not match.'],
    'auth/too-many-requests': [429, 'Too many attempts. Wait a few minutes and try again.'],
    'auth/popup-closed-by-user': [499, 'Sign-in was cancelled.'],
    'auth/popup-blocked': [499, 'Your browser blocked the sign-in window.'],
    'auth/account-exists-with-different-credential': [409, 'You already have an account with that email. Sign in the way you did the first time.'],
    'auth/operation-not-allowed': [503, 'That sign-in method is not switched on in Firebase yet.'],
    'auth/unauthorized-domain': [503, 'This site\'s address is not on the Firebase authorised domain list yet.'],
    /* Firebase reports a rejected sign-in handler as an internal error. In
       practice it is almost always the domain: the popup reaches Google, comes
       back to the handler, and the handler refuses an address it does not
       recognise. Saying so beats repeating Firebase's own wording. */
    'auth/internal-error': [503, 'Google sign-in could not complete. The usual cause is this site\'s address missing from Firebase → Authentication → Settings → Authorized domains.'],
    'auth/requires-recent-login': [401, 'For safety, sign in again before making this change.'],
    'permission-denied': [403, 'Firestore refused that write. Check your security rules.'],
    unavailable: [503, 'Firebase is unreachable right now.'],
  };
  const [status, message, field] = map[code] || [];
  if (status) return new FirebaseError(status, message, field);
  if (error instanceof FirebaseError) return error;
  return new FirebaseError(500, error?.message || 'Something went wrong.');
}

/* ------------------------------------------------------- Firestore helpers */

const userDoc = (s, uid) => s.doc(s.db, 'users', uid);
const sub = (s, uid, name) => s.collection(s.db, 'users', uid, name);
const subDoc = (s, uid, name, id) => s.doc(s.db, 'users', uid, name, id);

async function readProfile(s, uid) {
  const snapshot = await s.getDoc(userDoc(s, uid));
  return snapshot.exists() ? snapshot.data() : {};
}

const PROFILE_FIELDS = [
  'level', 'yearOrGrade', 'country', 'city', 'citizenship', 'subjects', 'goals',
  'types', 'regions', 'fundingNeed', 'experience', 'availability',
  'willingToTravel', 'notes', 'completedAt', 'updatedAt',
];

const onlyProfile = (data) => Object.fromEntries(
  PROFILE_FIELDS.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]),
);

async function listSub(s, uid, name) {
  const snapshot = await s.getDocs(sub(s, uid, name));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Everything under a user, removed before the account itself. */
async function purge(s, uid) {
  for (const name of ['saves', 'applications', 'reminders']) {
    const snapshot = await s.getDocs(sub(s, uid, name));
    await Promise.all(snapshot.docs.map((d) => s.deleteDoc(d.ref)));
  }
  await s.deleteDoc(userDoc(s, uid));
}

/* --------------------------------------------------------------- catalogue */

const decorate = (o, profile) => ({ ...o, liveStatus: deriveStatus(o), match: scoreOpportunity(o, profile) });

function filter(results, query) {
  const q = String(query.q || '').trim().toLowerCase();
  return results.filter((o) => {
    if (query.type && query.type !== 'all' && o.type !== query.type) return false;
    if (query.region && query.region !== 'all' && o.region !== query.region) return false;
    if (query.level && query.level !== 'all' && !(o.levels || []).includes(query.level)) return false;
    if (query.funding && query.funding !== 'all' && o.funding !== query.funding) return false;
    if (query.status && query.status !== 'all' && o.liveStatus !== query.status) return false;
    if (!q) return true;
    const haystack = [o.title, o.org, o.field, o.summary, o.location, o.country, (o.tags || []).join(' '), (o.subjects || []).join(' ')]
      .join(' ').toLowerCase();
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });
}

const SORTS = {
  match: (a, b) => (b.match.score ?? -1) - (a.match.score ?? -1),
  deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'),
  newest: (a, b) => String(b.verifiedAt || '').localeCompare(String(a.verifiedAt || '')),
  title: (a, b) => a.title.localeCompare(b.title),
};

/* ------------------------------------------------------------ the handler */

/** Reads that need nothing from Firebase to be correct. */
const PUBLIC_READ = /^\/api\/(opportunities)(\/|$)/;

export async function handle(method, path, { body, query } = {}) {
  try {
    return await route(method, path, { body, query });
  } catch (error) {
    const translated = translate(error);
    /**
     * The catalogue is public JSON served from the same edge as the page, so
     * browsing it must not depend on Google's CDN being reachable. When
     * Firebase is down, reading still works and only the personal layer —
     * match scores, saved state — is missing.
     */
    if (translated.status === 503 && method === 'GET' && PUBLIC_READ.test(path)) {
      return localHandle(method, path, { body, query });
    }
    throw translated;
  }
}

async function route(method, path, { body, query }) {
  const s = await loadSdk();
  const list = await loadCatalogue();
  const segments = path.replace(/^\/api\//, '').split('/');
  const [head, ...rest] = segments;

  /* -- auth ------------------------------------------------------------- */
  if (head === 'auth') {
    const action = rest[0];

    if (action === 'me') {
      const user = (await completeRedirect(s)) || (await currentUser());
      if (!user) return { user: null, profile: null };
      const profile = await readProfile(s, user.uid);
      return { user: publicUser(user, profile), profile: onlyProfile(profile) };
    }

    if (action === 'signup') {
      if (!body?.acceptedTerms) throw new FirebaseError(400, 'Please accept the terms and privacy policy.', 'acceptedTerms');
      if (String(body.password || '').length < 10) {
        throw new FirebaseError(400, 'Use at least 10 characters — length matters more than symbols.', 'password');
      }
      const credential = await s.createUserWithEmailAndPassword(s.auth, String(body.email || '').trim(), body.password);
      if (body.name) await s.updateProfile(credential.user, { displayName: body.name });
      const profile = {
        name: body.name || '',
        email: credential.user.email,
        isMinor: Boolean(body.isMinor),
        emailOptIn: Boolean(body.emailOptIn),
        createdAt: now(),
        updatedAt: now(),
      };
      await s.setDoc(userDoc(s, credential.user.uid), profile, { merge: true });
      return { user: publicUser(credential.user, profile), profile: onlyProfile(profile) };
    }

    if (action === 'login') {
      const credential = await s.signInWithEmailAndPassword(s.auth, String(body?.email || '').trim(), body?.password || '');
      const profile = await readProfile(s, credential.user.uid);
      return { user: publicUser(credential.user, profile), profile: onlyProfile(profile) };
    }

    /**
     * Google sign-in. A popup keeps the person on the page, but popups are
     * blocked in plenty of in-app browsers, so a failure falls back to a
     * full-page redirect rather than a dead button.
     */
    if (action === 'google') {
      const provider = new s.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      let credential;
      try {
        credential = await s.signInWithPopup(s.auth, provider);
      } catch (error) {
        const code = String(error?.code || '');
        /**
         * The popup flow needs the sign-in handler on another origin to reach
         * its own storage, which browsers increasingly refuse. When that
         * happens Firebase reports a blocked popup, an unsupported
         * environment, or simply an internal error — all of which the redirect
         * flow gets past, because the person's own browser does the navigating.
         */
        const popupFailed = [
          'auth/popup-blocked',
          'auth/operation-not-supported-in-this-environment',
          'auth/internal-error',
          'auth/web-storage-unsupported',
          'auth/missing-or-invalid-nonce',
        ].includes(code);
        if (popupFailed) {
          await s.signInWithRedirect(s.auth, provider);
          return { redirecting: true };
        }
        throw error;
      }
      const existing = await readProfile(s, credential.user.uid);
      const profile = {
        ...existing,
        name: existing.name || credential.user.displayName || '',
        email: credential.user.email,
        createdAt: existing.createdAt || now(),
        updatedAt: now(),
      };
      await s.setDoc(userDoc(s, credential.user.uid), profile, { merge: true });
      return { user: publicUser(credential.user, profile), profile: onlyProfile(profile) };
    }

    if (action === 'logout') {
      await s.signOut(s.auth);
      authReady = null;
      return { ok: true };
    }

    if (action === 'password') {
      const user = await requireUser();
      if (user.providerData?.[0]?.providerId === 'google.com') {
        throw new FirebaseError(400, 'This account signs in with Google, so there is no Radar password to change.');
      }
      if (String(body?.next || '').length < 10) {
        throw new FirebaseError(400, 'Use at least 10 characters — length matters more than symbols.', 'next');
      }
      /* Firebase wants a fresh sign-in before a password change, which is also
         how the current password gets checked. */
      const credential = s.EmailAuthProvider.credential(user.email, body?.current || '');
      await s.reauthenticateWithCredential(user, credential);
      await s.updatePassword(user, body.next);
      return { ok: true };
    }
  }

  /* -- profile ---------------------------------------------------------- */
  if (head === 'profile') {
    const user = await currentUser();
    if (method === 'GET') {
      if (!user) return {};
      return onlyProfile(await readProfile(s, user.uid));
    }
    if (!user) throw new FirebaseError(401, 'Sign in to continue.');
    const existing = await readProfile(s, user.uid);
    const merged = { ...existing, ...body, updatedAt: now() };
    merged.completedAt = merged.level && merged.country && (merged.subjects || []).length
      ? (existing.completedAt || now())
      : null;
    await s.setDoc(userDoc(s, user.uid), merged, { merge: true });
    return onlyProfile(merged);
  }

  /* -- catalogue -------------------------------------------------------- */
  if (head === 'opportunities' || head === 'matches') {
    const user = await currentUser();
    const profile = user ? onlyProfile(await readProfile(s, user.uid)) : {};
    const savedIds = user ? new Set((await listSub(s, user.uid, 'saves')).map((row) => row.id)) : new Set();

    if (head === 'matches') {
      if (!user) throw new FirebaseError(401, 'Sign in to continue.');
      if (!profile.completedAt) return { ready: false, results: [] };
      const ranked = rankOpportunities(list, profile)
        .map((o) => ({ ...o, liveStatus: deriveStatus(o) }))
        .filter((o) => o.liveStatus !== 'closed');
      return { ready: true, results: ranked.slice(0, 12) };
    }

    if (rest.length === 0) {
      const decorated = list.map((o) => decorate(o, profile));
      const filtered = filter(decorated, query || {});
      const sort = SORTS[query?.sort] || SORTS.match;
      return {
        total: decorated.length,
        count: filtered.length,
        personalised: Boolean(profile.completedAt),
        results: filtered.sort(sort).map((o) => ({ ...o, saved: savedIds.has(o.id) })),
      };
    }

    const key = rest[0];
    const found = list.find((o) => o.id === key || o.slug === key);
    if (!found) throw new FirebaseError(404, 'That opportunity is not in the catalogue.');
    const applications = user ? await listSub(s, user.uid, 'applications') : [];
    return {
      opportunity: decorate(found, profile),
      similar: similarOpportunities(found, list).map((o) => decorate(o, profile)),
      saved: savedIds.has(found.id),
      application: applications.find((a) => a.opportunityId === found.id) || null,
    };
  }

  /* -- saves ------------------------------------------------------------ */
  if (head === 'saves') {
    const user = await requireUser();
    if (method === 'GET') {
      const profile = onlyProfile(await readProfile(s, user.uid));
      const rows = await listSub(s, user.uid, 'saves');
      return rows
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .map((row) => list.find((o) => o.id === row.id))
        .filter(Boolean)
        .map((o) => ({ ...decorate(o, profile), saved: true }));
    }
    const id = rest[0];
    if (method === 'POST') {
      await s.setDoc(subDoc(s, user.uid, 'saves', id), { createdAt: now() });
      return { saved: true };
    }
    if (method === 'DELETE') {
      await s.deleteDoc(subDoc(s, user.uid, 'saves', id));
      return { saved: false };
    }
  }

  /* -- applications ------------------------------------------------------ */
  if (head === 'applications') {
    const user = await requireUser();
    const hydrate = async (application) => ({
      ...application,
      opportunity: list.find((o) => o.id === application.opportunityId) || null,
      reminders: (await listSub(s, user.uid, 'reminders')).filter((r) => r.opportunityId === application.opportunityId),
    });

    if (method === 'GET' && rest.length === 0) {
      const rows = await listSub(s, user.uid, 'applications');
      rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      return Promise.all(rows.map(hydrate));
    }

    if (method === 'POST' && rest.length === 0) {
      const opportunity = list.find((o) => o.id === body?.opportunityId);
      if (!opportunity) throw new FirebaseError(404, 'Unknown opportunity.');
      const rows = await listSub(s, user.uid, 'applications');
      const existing = rows.find((a) => a.opportunityId === opportunity.id);
      if (existing) return hydrate(existing);

      const ref = s.doc(sub(s, user.uid, 'applications'));
      const application = {
        opportunityId: opportunity.id,
        stage: body?.stage || 'saved',
        notes: '',
        contacts: '',
        appliedOn: null,
        resultOn: null,
        outcome: null,
        createdAt: now(),
        updatedAt: now(),
        checklist: (opportunity.documents || []).slice(0, 6).map((label, index) => ({
          id: `d${index}`, label, done: false,
        })),
        history: [{ id: 'h0', from: null, to: body?.stage || 'saved', note: 'Added to tracker', at: now() }],
      };
      await s.setDoc(ref, application);
      await s.setDoc(subDoc(s, user.uid, 'saves', opportunity.id), { createdAt: now() });
      return hydrate({ id: ref.id, ...application });
    }

    const applicationId = rest[0];
    const snapshot = await s.getDoc(subDoc(s, user.uid, 'applications', applicationId));
    if (!snapshot.exists()) throw new FirebaseError(404, 'That application is not in your tracker.');
    const application = { id: applicationId, ...snapshot.data() };

    if (rest[1] === 'checklist') {
      let checklist = application.checklist || [];
      if (method === 'POST') {
        checklist = [...checklist, { id: `c${Date.now()}`, label: String(body?.label || '').slice(0, 200), done: false }];
      } else if (method === 'PATCH') {
        checklist = checklist.map((item) => (item.id === rest[2] ? { ...item, done: Boolean(body?.done) } : item));
      } else if (method === 'DELETE') {
        checklist = checklist.filter((item) => item.id !== rest[2]);
      }
      const updated = { ...application, checklist, updatedAt: now() };
      await s.setDoc(subDoc(s, user.uid, 'applications', applicationId), updated, { merge: true });
      return hydrate(updated);
    }

    if (method === 'PATCH') {
      const history = body.stage && body.stage !== application.stage
        ? [{ id: `h${Date.now()}`, from: application.stage, to: body.stage, note: body.note || '', at: now() }, ...(application.history || [])]
        : application.history || [];
      const updated = {
        ...application,
        stage: body.stage ?? application.stage,
        notes: body.notes ?? application.notes,
        contacts: body.contacts ?? application.contacts,
        appliedOn: body.appliedOn !== undefined ? body.appliedOn : application.appliedOn,
        resultOn: body.resultOn !== undefined ? body.resultOn : application.resultOn,
        outcome: body.outcome !== undefined ? body.outcome : application.outcome,
        history,
        updatedAt: now(),
      };
      await s.setDoc(subDoc(s, user.uid, 'applications', applicationId), updated, { merge: true });
      return hydrate(updated);
    }

    if (method === 'DELETE') {
      await s.deleteDoc(subDoc(s, user.uid, 'applications', applicationId));
      return { ok: true };
    }
  }

  /* -- reminders --------------------------------------------------------- */
  if (head === 'reminders') {
    const user = await requireUser();
    const rows = await listSub(s, user.uid, 'reminders');

    if (rest[0] === 'due') {
      const today = now().slice(0, 10);
      return rows
        .filter((r) => r.remindOn <= today && !r.acknowledged)
        .map((r) => ({ ...r, opportunity: list.find((o) => o.id === r.opportunityId) }));
    }
    if (rest[1] === 'ack') {
      await s.setDoc(subDoc(s, user.uid, 'reminders', rest[0]), { acknowledged: true }, { merge: true });
      return { ok: true };
    }
    if (method === 'GET') {
      return rows
        .sort((a, b) => String(a.remindOn).localeCompare(String(b.remindOn)))
        .map((r) => ({ ...r, opportunity: list.find((o) => o.id === r.opportunityId) }));
    }
    if (method === 'POST') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body?.remindOn))) {
        throw new FirebaseError(400, 'Pick a reminder date.', 'remindOn');
      }
      const ref = s.doc(sub(s, user.uid, 'reminders'));
      const reminder = {
        opportunityId: body.opportunityId,
        remindOn: body.remindOn,
        channel: body.channel || 'in-app',
        label: body.label || '',
        acknowledged: false,
        createdAt: now(),
      };
      await s.setDoc(ref, reminder);
      return { id: ref.id, ...reminder };
    }
    if (method === 'DELETE') {
      await s.deleteDoc(subDoc(s, user.uid, 'reminders', rest[0]));
      return { ok: true };
    }
  }

  /* -- account ----------------------------------------------------------- */
  if (head === 'account') {
    const user = await requireUser();
    if (rest[0] === 'export') {
      const profile = await readProfile(s, user.uid);
      return {
        exportedAt: now(),
        account: publicUser(user, profile),
        profile: onlyProfile(profile),
        saves: await listSub(s, user.uid, 'saves'),
        applications: await listSub(s, user.uid, 'applications'),
        reminders: await listSub(s, user.uid, 'reminders'),
      };
    }
    if (method === 'DELETE') {
      /* Documents first: once the auth user is gone, the rules no longer let
         anyone — including them — reach those documents to clean them up. */
      await purge(s, user.uid);
      await s.deleteUser(user);
      authReady = null;
      return { deleted: true };
    }
  }

  /* -- write-only public collections -------------------------------------- */
  if (head === 'reports') {
    if (!body?.reason) throw new FirebaseError(400, 'Tell us what is wrong with the listing.', 'reason');
    const user = await currentUser();
    await s.addDoc(s.collection(s.db, 'reports'), {
      opportunityId: body.opportunityId || null,
      reason: String(body.reason).slice(0, 120),
      detail: String(body.detail || '').slice(0, 4000),
      contactEmail: body.contactEmail || null,
      userId: user?.uid || null,
      status: 'open',
      createdAt: now(),
    });
    return { received: true };
  }

  if (head === 'messages') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(body?.email || ''))) {
      throw new FirebaseError(400, 'Enter a valid email address.', 'email');
    }
    await s.addDoc(s.collection(s.db, 'messages'), {
      kind: body.kind === 'waitlist' ? 'waitlist' : 'contact',
      name: String(body.name || '').slice(0, 120),
      email: body.email,
      subject: String(body.subject || '').slice(0, 200),
      body: String(body.body || '').slice(0, 5000),
      status: 'new',
      createdAt: now(),
    });
    return { received: true };
  }

  /* Counting events would mean a Firestore write per interaction, billed and
     stored, to learn something a hosting provider's own analytics already
     shows. Not worth a student's data or your quota. */
  if (head === 'analytics') return { ok: true, counted: false };

  if (head === 'admin') {
    throw new FirebaseError(503, 'The admin console needs the Radar server. Run it locally to edit the catalogue.');
  }

  throw new FirebaseError(404, 'No such endpoint.');
}
