/**
 * Sign-up and sign-in. Both land people somewhere useful: a new account goes
 * to onboarding, a returning one to wherever they were headed.
 */
import { post, track } from './api.js';
import { $, handleForm, loadSession, toast } from './ui.js';

const params = new URLSearchParams(location.search);
const next = params.get('next');
const pendingSave = params.get('save');

/** Honour a save the visitor clicked before they had an account. */
async function flushPendingSave() {
  let id = pendingSave;
  try { id ||= sessionStorage.getItem('radar.pendingSave'); } catch { /* storage blocked */ }
  if (!id) return;
  try {
    await post(`/api/saves/${encodeURIComponent(id)}`);
    track('save', id, 'post-signup');
  } catch { /* the listing may have gone; not worth blocking the flow */ }
  try { sessionStorage.removeItem('radar.pendingSave'); } catch { /* fine */ }
}

const signup = $('#signup-form');
if (signup) {
  handleForm(signup, async (values) => {
    await post('/api/auth/signup', {
      email: values.email,
      password: values.password,
      name: values.name,
      isMinor: values.isMinor === '1',
      acceptedTerms: values.acceptedTerms === '1',
    });
    await loadSession({ force: true });
    await flushPendingSave();
    location.href = '/app/onboarding.html';
  }, { pendingLabel: 'Creating your account…' });
}

const login = $('#login-form');
if (login) {
  handleForm(login, async (values) => {
    const result = await post('/api/auth/login', { email: values.email, password: values.password });
    await loadSession({ force: true });
    await flushPendingSave();
    const destination = next && next.startsWith('/') && !next.startsWith('//')
      ? next
      : (result.profile?.completedAt ? '/app/dashboard.html' : '/app/onboarding.html');
    location.href = destination;
  }, { pendingLabel: 'Signing in…' });
}

/* Already signed in and looking at a sign-in page: send them on. */
loadSession().then((session) => {
  if (!session?.user) return;
  if (location.pathname.endsWith('login.html') || location.pathname.endsWith('signup.html')) {
    toast(`Already signed in as ${session.user.email}.`);
    setTimeout(() => { location.replace(next || '/app/dashboard.html'); }, 900);
  }
});
