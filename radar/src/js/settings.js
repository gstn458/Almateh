/**
 * Account settings: the profile summary, password, privacy controls, data
 * export and account deletion. Everything a person needs to leave cleanly.
 */
import { get, post, del, getRaw } from './api.js';
import { api } from './api.js';
import { $, esc, formatDate, handleForm, requireAuth, toast, announce } from './ui.js';
import { LEVELS, GOALS, FUNDING_NEEDS, EXPERIENCE } from './config.js';

const labelFor = (options, value) => options.find((o) => o.value === value)?.label || value || 'Not set';
const titleCase = (value) => String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function paintProfile(profile) {
  const rows = [
    ['Level', labelFor(LEVELS, profile.level)],
    ['Year or grade', profile.yearOrGrade || 'Not set'],
    ['Country', profile.country || 'Not set'],
    ['Citizenship', profile.citizenship || 'Not set'],
    ['Subjects', (profile.subjects || []).map(titleCase).join(', ') || 'None chosen'],
    ['Goals', (profile.goals || []).map((g) => labelFor(GOALS, g)).join(', ') || 'None chosen'],
    ['Regions', (profile.regions || []).join(', ') || 'Anywhere'],
    ['Funding need', labelFor(FUNDING_NEEDS, profile.fundingNeed)],
    ['Experience', labelFor(EXPERIENCE, profile.experience)],
    ['Availability', profile.availability ? titleCase(profile.availability) : 'No constraint'],
    ['Profile complete', profile.completedAt ? `Yes · ${formatDate(profile.completedAt)}` : 'Not yet'],
  ];
  $('#profile-summary').innerHTML = `<dl class="opp__facts">${rows.map(([term, value]) =>
    `<div><dt>${esc(term)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
}

const STORAGE_LABEL = {
  server: 'Your Radar account, on the Radar server (syncs across devices)',
  firebase: 'Your Radar account, in Firebase (syncs across devices)',
  local: 'This browser only — no server or Firebase project is reachable',
};

const SIGN_IN_LABEL = {
  'google.com': 'Google',
  password: 'Email and password',
};

function paintAccount(user) {
  /* A Google account has no Radar password, so offering to change one would
     be a form that can only fail. */
  const viaGoogle = user.provider === 'google.com';
  $('#google-account-note').hidden = !viaGoogle;
  $('#password-form').hidden = viaGoogle;

  const rows = [
    ['Email', user.email],
    ['Name', user.name || 'Not set'],
    ['Account type', user.role === 'admin' ? 'Administrator' : 'Student'],
    ['Signs in with', SIGN_IN_LABEL[user.provider] || 'Email and password'],
    ['Under 18', user.isMinor ? 'Yes' : 'No'],
    ['Created', formatDate(user.createdAt)],
    ['Storage', STORAGE_LABEL[api.mode] || STORAGE_LABEL.local],
  ];
  $('#account-summary').innerHTML = rows.map(([term, value]) =>
    `<div><dt>${esc(term)}</dt><dd>${esc(value)}</dd></div>`).join('');
}

/* ------------------------------------------------------------- privacy */
const analyticsToggle = $('#analytics-toggle');
try { analyticsToggle.checked = localStorage.getItem('radar.analytics.off') !== '1'; } catch { analyticsToggle.checked = true; }
analyticsToggle.addEventListener('change', () => {
  try {
    if (analyticsToggle.checked) localStorage.removeItem('radar.analytics.off');
    else localStorage.setItem('radar.analytics.off', '1');
  } catch { /* storage blocked: the preference cannot be remembered */ }
  announce(analyticsToggle.checked ? 'Anonymous counts are on.' : 'Anonymous counts are off.');
});

$('#export-data').addEventListener('click', async () => {
  try {
    const data = await get('/api/account/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'radar-my-data.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    announce('Your data export is downloading.');
  } catch (error) { toast(error.message, { tone: 'error' }); }
});

/* ------------------------------------------------------------ password */
const passwordForm = $('#password-form');
handleForm(passwordForm, async (values) => {
  await post('/api/auth/password', { current: values.current, next: values.next });
  passwordForm.reset();
  const success = passwordForm.querySelector('[data-form-success]');
  success.hidden = false;
  success.textContent = 'Password changed. Any other device you were signed in on has been signed out.';
  announce('Password changed.');
}, { pendingLabel: 'Changing…' });

/* -------------------------------------------------------------- delete */
const dialog = $('#delete-dialog');
$('#delete-account').addEventListener('click', () => dialog.showModal());
dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());

handleForm($('#delete-form'), async (values) => {
  if (values.confirm.trim().toUpperCase() !== 'DELETE') {
    throw Object.assign(new Error('Type DELETE to confirm.'), { field: 'confirm' });
  }
  await del('/api/account');
  location.href = '/?deleted=1';
}, { pendingLabel: 'Deleting…' });

$('#sign-out').addEventListener('click', async () => {
  await post('/api/auth/logout').catch(() => {});
  location.href = '/';
});

(async function init() {
  const session = await requireAuth();
  if (!session) return;
  paintAccount(session.user);
  try { paintProfile(await get('/api/profile')); } catch { paintProfile({}); }
}());
