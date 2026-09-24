/**
 * Shared browser behaviour: navigation, announcements, toasts, formatting,
 * and the opportunity card every listing page renders.
 *
 * The markup for the header and footer is static HTML on every page, so
 * navigation works with JavaScript switched off. This module only adds the
 * behaviour on top.
 */
import { api, get, post, del, track } from './api.js';
import { SITE, STAGES } from './config.js';
import { daysUntil, STATUS_LABEL } from './matching.js';

/* --------------------------------------------------------------- helpers */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/** Escapes text before it goes anywhere near innerHTML. */
export const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const stageLabel = (value) => STAGES.find((s) => s.value === value)?.label || value;

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date);
}

/** "in 12 days" / "3 days ago" — always with the absolute date beside it. */
export function relativeDays(iso) {
  const days = daysUntil(iso);
  if (days === null) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/**
 * How a deadline should read, including the case Radar must never fake: a
 * listing with no confirmed date.
 */
export function deadlineText(o) {
  if (!o.deadline) return o.deadlineLabel || 'No fixed date published';
  return `${formatDate(o.deadline)} · ${relativeDays(o.deadline)}`;
}

export function verificationText(o) {
  if (o.verificationStatus === 'verified' && o.verifiedAt) {
    const days = Math.abs(daysUntil(o.verifiedAt) || 0);
    const stale = days > SITE.verificationWindowDays;
    return {
      tone: stale ? 'warn' : 'ok',
      label: stale ? `Last checked ${formatDate(o.verifiedAt)} — due a re-check` : `Checked ${formatDate(o.verifiedAt)}`,
    };
  }
  return { tone: 'warn', label: 'Not yet verified by Radar' };
}

/* ---------------------------------------------------- announcements, toast */

let liveRegion;
/** Speaks a message to screen readers without moving focus. */
export function announce(message) {
  liveRegion ||= (() => {
    const node = document.createElement('p');
    node.className = 'sr-only';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    document.body.append(node);
    return node;
  })();
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = message; }, 60);
}

let toastRegion;

/**
 * Shows a message. Repeating the same one — clicking a broken button four
 * times — replaces the existing toast and counts it, rather than stacking
 * seven copies over the form the person is trying to read.
 */
export function toast(message, { tone = 'ok', announceIt = true } = {}) {
  toastRegion ||= (() => {
    const node = document.createElement('div');
    node.className = 'toast-region';
    document.body.append(node);
    return node;
  })();

  const existing = [...toastRegion.children].find((node) => node.dataset.message === message);
  if (existing) {
    const count = Number(existing.dataset.count || 1) + 1;
    existing.dataset.count = String(count);
    existing.textContent = `${message} (${count}×)`;
    clearTimeout(Number(existing.dataset.timer));
    existing.dataset.timer = String(setTimeout(() => existing.remove(), 5200));
    return;
  }

  const item = document.createElement('div');
  item.className = `toast${tone === 'error' ? ' toast--error' : ''}`;
  item.textContent = message;
  item.dataset.message = message;
  item.dataset.timer = String(setTimeout(() => item.remove(), 5200));
  toastRegion.append(item);
  /* More than a few at once means something is looping; keep the newest. */
  while (toastRegion.children.length > 3) toastRegion.firstElementChild.remove();
  if (announceIt) announce(message);
}

/* ------------------------------------------------------------- navigation */

/**
 * Mobile menu: focus moves into the panel, stays trapped while it is open,
 * and returns to the button when it closes.
 */
function setupNav() {
  const toggle = $('.nav-toggle');
  const panel = $('#site-nav-panel');
  if (!toggle || !panel) return;

  const focusables = () => $$('a[href], button:not([disabled]), input, select, textarea', panel)
    .filter((node) => node.offsetParent !== null);

  const close = ({ restore = true } = {}) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    toggle.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    document.body.style.removeProperty('overflow');
    if (restore) toggle.focus();
  };

  const open = () => {
    toggle.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    focusables()[0]?.focus();
  };

  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') close();
    else open();
  });

  document.addEventListener('keydown', (event) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { close(); return; }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  /* A resize past the breakpoint leaves the panel visible but unmanaged. */
  window.matchMedia('(min-width:901px)').addEventListener('change', (event) => {
    if (event.matches) close({ restore: false });
  });
}

/** Marks the current page in the navigation for sighted and screen readers. */
function markCurrentPage() {
  const here = location.pathname.replace(/index\.html$/, '') || '/';
  $$('.site-nav a, .app-side a').forEach((link) => {
    const target = new URL(link.getAttribute('href'), location.origin).pathname.replace(/index\.html$/, '');
    if (target === here) link.setAttribute('aria-current', 'page');
  });
}

/* ------------------------------------------------------------ auth state */

let session = null;
let sessionPromise = null;

export function loadSession({ force = false } = {}) {
  if (force) sessionPromise = null;
  sessionPromise ||= get('/api/auth/me')
    .then((result) => { session = result; return result; })
    .catch(() => ({ user: null, profile: null }));
  return sessionPromise;
}

export const currentSession = () => session;

/** Swaps the header's sign-in links for the account links once signed in. */
async function paintAuthState() {
  const result = await loadSession();
  const signedIn = Boolean(result?.user);
  $$('[data-when="signed-in"]').forEach((node) => { node.hidden = !signedIn; });
  $$('[data-when="signed-out"]').forEach((node) => { node.hidden = signedIn; });
  $$('[data-user-name]').forEach((node) => {
    node.textContent = result?.user?.name || result?.user?.email || '';
  });
  return result;
}

/** Sends people who are not signed in to the login page, with a return path. */
export async function requireAuth() {
  const result = await loadSession();
  if (!result?.user) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(`/app/login.html?next=${next}`);
    return null;
  }
  return result;
}

/* ------------------------------------------------------- local-mode notice */

function paintModeNotice() {
  const render = () => {
    const node = $('#storage-mode');
    if (!node) return;
    if (api.mode === 'local') {
      node.hidden = false;
      node.innerHTML = `<strong>Offline mode.</strong> Neither the Radar server nor a Firebase project is
        reachable, so your profile, saves and tracker are being kept in this browser only. They will not
        appear on another device.`;
    } else {
      /* Server and Firebase both mean a real account, so there is nothing to
         warn about — saying "you are signed in" on every page is just noise. */
      node.hidden = true;
    }
  };
  api.onModeChange = render;
  render();
}

/**
 * The "Continue with Google" buttons.
 *
 * Shown only when Firebase is the backend actually serving this page. A
 * configured project is not enough: when the Node API answers it owns the
 * session, and it has no idea what a Google credential is. A button that
 * cannot work should not be on the page at all.
 */
async function wireGoogleButtons() {
  const buttons = $$('[data-google-signin]');
  if (!buttons.length) return;

  const { FIREBASE } = await import('./firebase-config.js');
  await loadSession();          // settles api.mode before anything is shown
  const available = api.mode === 'firebase' && FIREBASE.providers.google;
  buttons.forEach((button) => { button.closest('[data-google-block]')?.toggleAttribute('hidden', !available); });
  if (!available) return;

  /* Warm the backend now. Loading the SDK takes long enough that a popup
     opened after it can fall outside the click's activation window and be
     blocked — so the click itself should have nothing left to wait for. */
  import('./firebase-backend.js').catch(() => {});

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Opening Google…';
      try {
        const result = await post('/api/auth/google');
        if (result?.redirecting) return;   // the page is navigating away
        await loadSession({ force: true });
        const params = new URLSearchParams(location.search);
        const next = params.get('next');
        const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
        location.href = safe || (result.profile?.completedAt ? '/app/dashboard.html' : '/app/onboarding.html');
      } catch (error) {
        if (error.status !== 499) toast(error.message || 'Google sign-in did not work.', { tone: 'error' });
        button.disabled = false;
        button.textContent = original;
      }
    });
  });
}

/* --------------------------------------------------- opportunity rendering */

export function statusChip(o) {
  const status = o.liveStatus || o.status || 'pathway';
  return `<span class="status status--${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span>`;
}

/**
 * One opportunity card. The match score never appears without the reason
 * beneath it — an unexplained number is the thing Radar is meant to replace.
 */
export function opportunityCard(o, { showWhy = true } = {}) {
  const score = o.match?.score;
  const reason = o.match?.reasons?.[0];
  const verification = verificationText(o);
  const href = `/opportunity.html?id=${encodeURIComponent(o.id)}`;

  return `
  <article class="opp" data-opportunity="${esc(o.id)}">
    <div class="opp__top">
      <span class="opp__type">${esc(o.type)}</span>
      ${statusChip(o)}
    </div>
    <h3 class="opp__title"><a href="${href}">${esc(o.title)}</a></h3>
    <p class="opp__org">${esc(o.org)} · ${esc(o.field)}</p>
    <p class="opp__summary">${esc(o.summary)}</p>
    ${showWhy && score !== null && score !== undefined && reason
      ? `<p class="opp__why"><strong>${score}% match.</strong> ${esc(reason)}</p>`
      : ''}
    <dl class="opp__facts">
      <div><dt>Deadline</dt><dd>${esc(deadlineText(o))}</dd></div>
      <div><dt>Where</dt><dd>${esc(o.location)}</dd></div>
      <div><dt>Funding</dt><dd>${esc(o.fundingDetails || o.funding)}</dd></div>
      <div><dt>Checked</dt><dd>${esc(verification.label)}</dd></div>
    </dl>
    <div class="opp__foot">
      <div class="opp__actions">
        <button class="save-btn" type="button" data-save="${esc(o.id)}"
                aria-pressed="${o.saved ? 'true' : 'false'}"
                aria-label="${o.saved ? 'Remove' : 'Save'} ${esc(o.title)}">
          ${o.saved ? 'Saved' : 'Save'}
        </button>
        <a class="btn btn--ghost btn--sm" href="${href}">Details</a>
      </div>
      ${score !== null && score !== undefined
        ? `<p class="opp__match"><b class="tnum">${score}<span class="sr-only"> percent match</span></b><span aria-hidden="true">Match</span></p>`
        : ''}
    </div>
  </article>`;
}

/**
 * Wires every save button inside `scope`. Signed-out visitors are sent to sign
 * up rather than silently losing the save.
 */
export function wireSaveButtons(scope = document) {
  scope.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-save]');
    if (!button) return;
    event.preventDefault();

    const result = await loadSession();
    if (!result?.user) {
      const id = button.dataset.save;
      try { sessionStorage.setItem('radar.pendingSave', id); } catch { /* not critical */ }
      location.href = `/app/signup.html?next=${encodeURIComponent(location.pathname + location.search)}&save=${encodeURIComponent(id)}`;
      return;
    }

    const id = button.dataset.save;
    const saved = button.getAttribute('aria-pressed') === 'true';
    button.disabled = true;
    try {
      if (saved) {
        await del(`/api/saves/${encodeURIComponent(id)}`);
        button.setAttribute('aria-pressed', 'false');
        button.textContent = 'Save';
        announce('Removed from your saved opportunities.');
      } else {
        await post(`/api/saves/${encodeURIComponent(id)}`);
        button.setAttribute('aria-pressed', 'true');
        button.textContent = 'Saved';
        announce('Saved. It is now on your dashboard.');
        track('save', id, 'card');
      }
      button.setAttribute('aria-label', `${saved ? 'Save' : 'Remove'} opportunity`);
      document.dispatchEvent(new CustomEvent('radar:save-changed', { detail: { id, saved: !saved } }));
    } catch (error) {
      toast(error.message || 'That did not save.', { tone: 'error' });
    } finally {
      button.disabled = false;
    }
  });
}

/* ------------------------------------------------------------ form helper */

/**
 * Standard form submit: disables the button, clears old errors, shows a
 * field-level message when the API names a field, and never loses the input.
 */
export function handleForm(form, submit, { pendingLabel = 'Working…' } = {}) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const original = button?.textContent;
    const errorBox = form.querySelector('[data-form-error]');

    if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
    form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
    form.querySelectorAll('[data-field-error]').forEach((node) => { node.textContent = ''; });

    if (button) { button.disabled = true; button.textContent = pendingLabel; }
    try {
      await submit(Object.fromEntries(new FormData(form)), form);
    } catch (error) {
      const message = error.message || 'That did not work. Please try again.';
      if (error.field) {
        const field = form.querySelector(`[name="${error.field}"]`);
        field?.setAttribute('aria-invalid', 'true');
        const slot = form.querySelector(`[data-field-error="${error.field}"]`);
        if (slot) slot.textContent = message;
        field?.focus();
      }
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = message;
        errorBox.setAttribute('tabindex', '-1');
        errorBox.focus();
      } else {
        toast(message, { tone: 'error' });
      }
      announce(message);
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  });
}

/* ------------------------------------------------------------ bootstrap */

export function initShell() {
  setupNav();
  markCurrentPage();
  paintModeNotice();
  wireGoogleButtons();
  wireSaveButtons(document);
  paintAuthState();
  $('#year') && ($('#year').textContent = String(new Date().getFullYear()));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShell, { once: true });
} else {
  initShell();
}
