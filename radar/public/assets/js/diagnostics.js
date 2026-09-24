/**
 * A page that answers "what is this browser actually running?".
 *
 * Debugging someone else's browser by asking them to describe it does not
 * work. This reports the deployed build, the active backend, the Firebase
 * configuration in use and the raw error from a real sign-in attempt, so one
 * screenshot carries everything needed to identify a problem.
 */
import { api, get } from './api.js?v=1ed1068b03';
import { $, esc } from './ui.js?v=1ed1068b03';
import { FIREBASE, firebaseReady } from './firebase-config.js?v=1ed1068b03';
import { BUILD } from './build.js?v=1ed1068b03';

const row = (term, value, tone) =>
  `<div><dt>${esc(term)}</dt><dd${tone ? ` style="color:var(--${tone})"` : ''}>${esc(value)}</dd></div>`;

/* ------------------------------------------------------- build and mode */
(async function build() {
  /* Touch the API so api.mode settles before it is reported. */
  let session = null;
  let sessionError = null;
  try {
    session = await get('/api/auth/me');
  } catch (error) {
    sessionError = `${error.status || ''} ${error.message}`.trim();
  }

  const MODE_LABEL = {
    server: 'Radar server (SQLite)',
    firebase: 'Firebase (Auth + Firestore)',
    local: 'This browser only — no backend reachable',
  };

  $('#diag-build').innerHTML = [
    row('Build', `${BUILD.id} · ${BUILD.builtAt}`),
    row('Page address', location.origin),
    row('Backend in use', MODE_LABEL[api.mode] || api.mode, api.mode === 'local' ? 'warn' : 'signal'),
    row('Signed in as', session?.user?.email || 'nobody', session?.user ? 'signal' : null),
    row('Session lookup', sessionError || 'ok', sessionError ? 'danger' : 'signal'),
    row('Online', navigator.onLine ? 'yes' : 'no'),
  ].join('');
}());

/* ----------------------------------------------------------- firebase */
(async function firebase() {
  const configured = firebaseReady();
  const rows = [
    row('Configured', configured ? 'yes' : 'no', configured ? 'signal' : 'warn'),
    row('Enabled flag', String(FIREBASE.enabled)),
    row('Project', FIREBASE.config.projectId || '(not set)'),
    row('Auth domain', FIREBASE.config.authDomain || '(not set)'),
    row('SDK version', FIREBASE.sdkVersion),
  ];

  if (configured) {
    /* Load the SDK here rather than on a click, so its own failure is
       reported as itself instead of as a failed sign-in. */
    let sdkStatus = 'loading…';
    let tone = null;
    try {
      await import(`https://www.gstatic.com/firebasejs/${FIREBASE.sdkVersion}/firebase-app.js`);
      sdkStatus = 'loaded';
      tone = 'signal';
    } catch (error) {
      sdkStatus = `could not load — ${error.message}`;
      tone = 'danger';
    }
    rows.push(row('SDK from gstatic.com', sdkStatus, tone));

    const handler = `https://${FIREBASE.config.authDomain}/__/auth/handler`;
    $('#diag-handler-note').innerHTML = `Google sign-in hands control to
      <a href="${esc(handler)}" target="_blank" rel="noopener noreferrer" style="color:var(--signal);text-decoration:underline">${esc(handler)}</a>.
      Open it: a Firebase page or a blank page means it is working. <strong>"Site Not Found" means Firebase Hosting
      was never initialised for this project</strong>, and sign-in cannot complete until it is
      (Firebase console → Build → Hosting → Get started).`;
  }

  $('#diag-firebase').innerHTML = rows.join('');
}());

/* --------------------------------------------------------- the test */
$('#diag-test').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const output = $('#diag-result');
  button.disabled = true;
  button.textContent = 'Running…';
  output.hidden = false;
  output.textContent = 'Starting Google sign-in…';

  try {
    const result = await import('./firebase-backend.js?v=1ed1068b03').then((m) => m.handle('POST', '/api/auth/google', {}));
    output.textContent = `Success.\n\n${JSON.stringify(result, null, 2)}`;
  } catch (error) {
    /* Firebase hides the useful part in customData; print everything. */
    output.textContent = [
      `Failed.`,
      ``,
      `status:  ${error.status ?? '(none)'}`,
      `code:    ${error.code ?? '(none)'}`,
      `message: ${error.message}`,
      ``,
      `full error:`,
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    ].join('\n');
  } finally {
    button.disabled = false;
    button.textContent = 'Run the test again';
  }
});

/* ------------------------------------------------------ cache clearing */
$('#diag-clear').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Clearing…';
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    const registrations = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch { /* nothing cached, or the browser refuses; the reload still helps */ }
  /* A query string the browser has never seen forces a fresh copy of the
     document, and the revalidating headers take it from there. */
  location.href = `${location.pathname}?fresh=${Date.now()}`;
});
