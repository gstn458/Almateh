/**
 * The administrator console: catalogue maintenance, reports, users and link
 * checks. One module serves all five admin pages and only runs the part the
 * current page actually contains.
 *
 * This needs the Radar server — there is nothing to administer in a browser's
 * own storage, and the module says so rather than failing quietly.
 */
import { get, post, put, del, api } from './api.js';
import { $, $$, esc, formatDate, handleForm, toast, announce, loadSession } from './ui.js';

const gate = $('#admin-gate');
const content = $('#admin-content');

const table = (headers, rows) => `
  <thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}">Nothing here.</td></tr>`}</tbody>`;

function showGate(message) {
  if (content) content.hidden = true;
  if (!gate) return;
  gate.hidden = false;
  if (message) {
    const notice = document.createElement('p');
    notice.className = 'notice';
    notice.textContent = message;
    gate.prepend(notice);
  }
}

/* ------------------------------------------------------------ overview */
async function paintOverview() {
  if (!$('#admin-stats')) return;
  const data = await get('/api/admin/overview');

  $('#admin-stats').innerHTML = [
    [data.opportunities, 'Listings'],
    [data.needsReview, 'Need review'],
    [data.expired, 'Expired'],
    [data.brokenLinks, 'Broken links'],
    [data.openReports, 'Open reports'],
    [data.newMessages, 'New messages'],
    [data.users, 'Accounts'],
    [data.applications, 'Applications'],
  ].map(([value, label]) => `<div class="stat"><b class="tnum">${value}</b><span>${esc(label)}</span></div>`).join('');

  $('#stale-table').innerHTML = table(
    ['Listing', 'Last verified', ''],
    data.staleVerification.map((o) => `
      <tr>
        <td><a href="/opportunity.html?id=${esc(o.id)}" target="_blank" rel="noopener">${esc(o.title)}</a></td>
        <td>${esc(o.verifiedAt ? formatDate(o.verifiedAt) : 'Never')}</td>
        <td><button class="btn btn--ghost btn--sm" type="button" data-verify="${esc(o.id)}">Mark verified</button></td>
      </tr>`),
  );

  $('#analytics-table').innerHTML = table(
    ['Event', 'Count'],
    data.analytics.map((row) => `<tr><td>${esc(row.name)}</td><td class="tnum">${row.n}</td></tr>`),
  );

  const audit = await get('/api/admin/audit');
  $('#audit-table').innerHTML = table(
    ['When', 'Who', 'Action', 'Subject'],
    audit.map((row) => `
      <tr><td>${esc(formatDate(row.created_at))}</td><td>${esc(row.actor_email || '—')}</td>
      <td>${esc(row.action)}</td><td>${esc(row.detail || row.subject)}</td></tr>`),
  );
}

$('#stale-table')?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-verify]');
  if (!button) return;
  if (!confirm('Only mark this verified after opening the official page and confirming the deadline, eligibility and funding. Confirm?')) return;
  try {
    await post(`/api/admin/opportunities/${button.dataset.verify}/verify`);
    toast('Marked verified today.');
    paintOverview();
  } catch (error) { toast(error.message, { tone: 'error' }); }
});

$('#run-expire')?.addEventListener('click', async () => {
  try {
    const result = await post('/api/admin/expire-pass');
    $('#maintenance-result').textContent = `${result.expired} listing${result.expired === 1 ? '' : 's'} marked expired. Recurring programmes stay in the catalogue so students can plan for the next cycle.`;
    paintOverview();
  } catch (error) { toast(error.message, { tone: 'error' }); }
});

/* ----------------------------------------------------------- catalogue */
let catalogue = [];

async function paintCatalogue() {
  const node = $('#catalogue-table');
  if (!node) return;
  catalogue = await get('/api/admin/opportunities');
  filterCatalogue();
}

function filterCatalogue() {
  const node = $('#catalogue-table');
  const term = ($('#admin-search')?.value || '').toLowerCase();
  const mode = $('#admin-filter')?.value || 'all';

  const rows = catalogue.filter((o) => {
    if (term && !`${o.title} ${o.org}`.toLowerCase().includes(term)) return false;
    if (mode === 'needs-review') return o.verificationStatus !== 'verified';
    if (mode === 'verified') return o.verificationStatus === 'verified';
    if (mode === 'expired') return o.isExpired;
    if (mode === 'broken') return o.linkStatus && o.linkStatus !== 'ok';
    return true;
  });

  $('#admin-count').textContent = `${rows.length} of ${catalogue.length} listings`;
  node.innerHTML = table(
    ['Listing', 'Type', 'Deadline', 'Verified', 'Link', ''],
    rows.map((o) => `
      <tr>
        <td><b style="color:var(--ink);font-weight:500">${esc(o.title)}</b><br><span class="meta">${esc(o.org)}</span></td>
        <td>${esc(o.type)}</td>
        <td>${esc(o.deadline ? formatDate(o.deadline) : o.deadlineLabel || '—')}${o.isExpired ? '<br><span class="status status--closed">Expired</span>' : ''}</td>
        <td>${o.verificationStatus === 'verified'
          ? `<span class="status status--open">${esc(formatDate(o.verifiedAt))}</span>`
          : '<span class="status status--closing-soon">Needs review</span>'}</td>
        <td>${o.linkStatus ? `<span class="status status--${o.linkStatus === 'ok' ? 'open' : 'closed'}">${esc(o.linkStatus)}</span>` : '<span class="meta">—</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn--ghost btn--sm" type="button" data-edit="${esc(o.id)}">Edit</button>
          <button class="btn btn--quiet btn--sm" type="button" data-delete="${esc(o.id)}">Delete</button>
        </td>
      </tr>`),
  );
}

$('#admin-search')?.addEventListener('input', filterCatalogue);
$('#admin-filter')?.addEventListener('change', filterCatalogue);

const editDialog = $('#edit-dialog');
const editForm = $('#edit-form');

function openEditor(o = {}) {
  editForm.reset();
  for (const [key, value] of Object.entries(o)) {
    const field = editForm.elements[key];
    if (!field) continue;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value ?? '';
  }
  $('#edit-title').textContent = o.id ? 'Edit listing' : 'Add a listing';
  $('#verify-now').hidden = !o.id;
  editDialog.showModal();
}

$('#new-opportunity')?.addEventListener('click', () => openEditor());
editDialog?.querySelector('[data-close-dialog]')?.addEventListener('click', () => editDialog.close());

$('#catalogue-table')?.addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-edit]');
  if (edit) { openEditor(catalogue.find((o) => o.id === edit.dataset.edit)); return; }

  const remove = event.target.closest('[data-delete]');
  if (remove) {
    const o = catalogue.find((x) => x.id === remove.dataset.delete);
    if (!confirm(`Delete "${o?.title}" permanently? Marking it expired is usually better — students can still see it and plan for the next cycle.`)) return;
    try {
      await del(`/api/admin/opportunities/${remove.dataset.delete}`);
      await paintCatalogue();
      announce('Listing deleted.');
    } catch (error) { toast(error.message, { tone: 'error' }); }
  }
});

if (editForm) {
  handleForm(editForm, async (values) => {
    const payload = {
      ...values,
      deadline: values.deadline || null,
      isExpired: values.isExpired === '1',
      isFeatured: values.isFeatured === '1',
    };
    if (values.id) await put(`/api/admin/opportunities/${values.id}`, payload);
    else await post('/api/admin/opportunities', payload);
    editDialog.close();
    await paintCatalogue();
    toast('Listing saved.');
  }, { pendingLabel: 'Saving…' });

  $('#verify-now')?.addEventListener('click', async () => {
    const id = editForm.elements.id.value;
    if (!id) return;
    if (!confirm('Confirm you have opened the official page and checked the deadline, eligibility and funding today.')) return;
    try {
      await post(`/api/admin/opportunities/${id}/verify`);
      editDialog.close();
      await paintCatalogue();
      toast('Marked verified today.');
    } catch (error) { toast(error.message, { tone: 'error' }); }
  });
}

/* ------------------------------------------------------------- reports */
async function paintReports() {
  const node = $('#reports-table');
  if (!node) return;

  const reports = await get('/api/admin/reports');
  node.innerHTML = table(
    ['Reported', 'Listing', 'Problem', 'Detail', 'Status', ''],
    reports.map((r) => `
      <tr>
        <td>${esc(formatDate(r.created_at))}</td>
        <td>${r.opportunity ? `<a href="/opportunity.html?id=${esc(r.opportunity.id)}" target="_blank" rel="noopener">${esc(r.opportunity.title)}</a>` : '<span class="meta">General</span>'}</td>
        <td>${esc(r.reason)}</td>
        <td style="max-width:320px">${esc(r.detail || '—')}</td>
        <td><span class="status status--${r.status === 'open' ? 'closing-soon' : 'open'}">${esc(r.status)}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn--ghost btn--sm" type="button" data-report="${esc(r.id)}" data-status="resolved">Resolve</button>
          <button class="btn btn--quiet btn--sm" type="button" data-report="${esc(r.id)}" data-status="rejected">Dismiss</button>
        </td>
      </tr>`),
  );

  const messages = await get('/api/admin/messages');
  $('#messages-table').innerHTML = table(
    ['When', 'Kind', 'From', 'Subject', 'Message'],
    messages.map((m) => `
      <tr>
        <td>${esc(formatDate(m.created_at))}</td>
        <td>${esc(m.kind)}</td>
        <td>${esc(m.name || '—')}<br><span class="meta">${esc(m.email)}</span></td>
        <td>${esc(m.subject || '—')}</td>
        <td style="max-width:360px">${esc(m.body || '—')}</td>
      </tr>`),
  );
}

$('#reports-table')?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-report]');
  if (!button) return;
  const resolution = prompt('What was done about this report?', button.dataset.status === 'resolved' ? 'Listing corrected.' : 'No change needed.');
  if (resolution === null) return;
  try {
    await fetch(`/api/admin/reports/${button.dataset.report}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: button.dataset.status, resolution }),
    });
    await paintReports();
    announce('Report updated.');
  } catch (error) { toast(error.message, { tone: 'error' }); }
});

/* --------------------------------------------------------------- users */
async function paintUsers() {
  const node = $('#users-table');
  if (!node) return;
  const users = await get('/api/admin/users');
  node.innerHTML = table(
    ['Account', 'Role', 'Profile', 'Saves', 'Applications', 'Joined', 'Last seen'],
    users.map((u) => `
      <tr>
        <td>${esc(u.email)}${u.is_minor ? ' <span class="chip chip--warn">Under 18</span>' : ''}${u.deleted_at ? ' <span class="chip">Deleted</span>' : ''}</td>
        <td>${esc(u.role)}</td>
        <td>${u.profile_completed_at ? 'Complete' : 'Incomplete'}</td>
        <td class="tnum">${u.saves}</td>
        <td class="tnum">${u.applications}</td>
        <td>${esc(formatDate(u.created_at))}</td>
        <td>${esc(u.last_seen_at ? formatDate(u.last_seen_at) : '—')}</td>
      </tr>`),
  );
}

/* ---------------------------------------------------------- link check */
$('#run-link-check')?.addEventListener('click', async () => {
  const status = $('#link-status');
  const button = $('#run-link-check');
  button.disabled = true;
  status.textContent = 'Checking every application link. This takes a moment.';
  try {
    const result = await post('/api/admin/link-check');
    const broken = result.results.filter((r) => r.status !== 'ok');
    status.textContent = `${result.results.length} links checked · ${broken.length} need attention.`;
    $('#links-table').innerHTML = table(
      ['Listing', 'URL', 'Result'],
      result.results.map((r) => `
        <tr>
          <td>${esc(r.title)}</td>
          <td style="max-width:360px;word-break:break-all"><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url)}</a></td>
          <td><span class="status status--${r.status === 'ok' ? 'open' : 'closed'}">${esc(r.status)}</span></td>
        </tr>`),
    );
    announce(`${broken.length} links need attention.`);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

/* ------------------------------------------------------------ sign-in */
const loginForm = $('#admin-login');
if (loginForm) {
  handleForm(loginForm, async (values) => {
    await post('/api/auth/login', values);
    await loadSession({ force: true });
    location.reload();
  }, { pendingLabel: 'Signing in…' });
}

$('#admin-signout')?.addEventListener('click', async () => {
  await post('/api/auth/logout').catch(() => {});
  location.reload();
});

(async function init() {
  if (api.mode !== 'server') {
    /* The probe may not have run yet; ask for the session and find out. */
    await loadSession({ force: true });
  }
  if (api.mode !== 'server') {
    showGate('The admin console needs the Radar server. Start it with `node server/index.js`.');
    return;
  }

  const session = await loadSession({ force: true });
  if (session?.user?.role !== 'admin') {
    showGate(session?.user ? 'That account is not an administrator.' : null);
    return;
  }

  if (gate) gate.hidden = true;
  if (content) content.hidden = false;
  $('#admin-signout')?.removeAttribute('hidden');

  try {
    await Promise.all([paintOverview(), paintCatalogue(), paintReports(), paintUsers()]);
  } catch (error) {
    toast(error.message, { tone: 'error' });
  }
}());
