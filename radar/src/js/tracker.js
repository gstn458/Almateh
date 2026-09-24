/**
 * The application tracker.
 *
 * Each application is one expandable card holding everything about that
 * application: stage, notes, document checklist, contacts, dates, outcome and
 * the history of how it got here.
 */
import { get, patch, post, del, track } from './api.js';
import { $, $$, esc, formatDate, relativeDays, stageLabel, requireAuth, toast, announce } from './ui.js';
import { STAGES } from './config.js';
import { daysUntil } from './matching.js';

const listNode = $('#tracker-list');
const countNode = $('#tracker-count');
const filterBar = $('#stage-filters');

const GROUPS = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'working', label: 'Working on it' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'closed', label: 'Finished' },
];

let applications = [];
let filter = 'all';

filterBar.innerHTML = GROUPS.map(({ value, label }) =>
  `<button class="filter" type="button" data-group="${value}" aria-pressed="${value === 'all'}">${label}</button>`).join('');

const groupOf = (stage) => STAGES.find((s) => s.value === stage)?.group || 'planning';

function card(a) {
  const o = a.opportunity;
  const done = (a.checklist || []).filter((c) => c.done).length;
  const total = (a.checklist || []).length;
  const days = o?.deadline ? daysUntil(o.deadline) : null;

  return `
  <article class="panel" id="${esc(a.id)}" data-application="${esc(a.id)}">
    <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start">
      <div style="min-width:0">
        <h2 class="h4" style="margin:0">
          <a href="/opportunity.html?id=${esc(a.opportunityId)}">${esc(o?.title || 'Opportunity')}</a>
        </h2>
        <p class="meta" style="margin-top:.4rem">${esc(o?.org || '')}${o?.deadline
          ? ` · closes ${esc(formatDate(o.deadline))} (${esc(relativeDays(o.deadline))})`
          : ' · no fixed date published'}</p>
      </div>
      <span class="stage-badge" data-stage="${esc(a.stage)}">${esc(stageLabel(a.stage))}</span>
    </div>

    ${days !== null && days >= 0 && days <= 21 && !['submitted', 'accepted', 'rejected', 'not-eligible'].includes(a.stage)
      ? `<p class="notice" style="margin-top:1rem">Closing in ${days} ${days === 1 ? 'day' : 'days'}.</p>` : ''}

    ${total ? `<div class="progress"><span style="width:${Math.round((done / total) * 100)}%"></span></div>
      <p class="meta">${done} of ${total} documents ready</p>` : ''}

    <details style="margin-top:1.2rem">
      <summary style="cursor:pointer;color:var(--signal);font:10px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;padding:.6rem 0">
        Open this application
      </summary>

      <div style="margin-top:1.5rem">
        <label class="field" style="max-width:320px">
          <span class="field__label" for="stage-${esc(a.id)}">Stage</span>
          <select class="select" id="stage-${esc(a.id)}" data-stage-select="${esc(a.id)}">
            ${STAGES.map((s) => `<option value="${s.value}"${s.value === a.stage ? ' selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </label>

        <div class="grid grid--2" style="background:transparent;gap:1rem">
          <label class="field">
            <span class="field__label" for="applied-${esc(a.id)}">Date applied</span>
            <input class="input" id="applied-${esc(a.id)}" type="date" data-field="appliedOn" data-id="${esc(a.id)}" value="${esc(a.appliedOn || '')}">
          </label>
          <label class="field">
            <span class="field__label" for="result-${esc(a.id)}">Result expected or received</span>
            <input class="input" id="result-${esc(a.id)}" type="date" data-field="resultOn" data-id="${esc(a.id)}" value="${esc(a.resultOn || '')}">
          </label>
        </div>

        <h3 class="h4" style="margin-top:1.5rem">Document checklist</h3>
        <ul class="checklist">
          ${(a.checklist || []).map((item) => `
            <li>
              <input type="checkbox" id="item-${esc(item.id)}" data-check="${esc(item.id)}" data-id="${esc(a.id)}"${item.done ? ' checked' : ''}>
              <label for="item-${esc(item.id)}">${esc(item.label)}</label>
              <button class="btn btn--quiet btn--sm" type="button" data-remove-item="${esc(item.id)}" data-id="${esc(a.id)}" aria-label="Remove ${esc(item.label)}">Remove</button>
            </li>`).join('')}
        </ul>
        <form data-add-item="${esc(a.id)}" style="display:flex;gap:.5rem;margin-top:.8rem;flex-wrap:wrap">
          <label class="sr-only" for="new-item-${esc(a.id)}">Add a task or document</label>
          <input class="input" id="new-item-${esc(a.id)}" name="label" style="flex:1;min-width:200px" placeholder="Add a document or task" maxlength="200">
          <button class="btn btn--ghost btn--sm" type="submit">Add</button>
        </form>

        <label class="field" style="margin-top:1.5rem">
          <span class="field__label" for="notes-${esc(a.id)}">Private notes</span>
          <textarea class="textarea" id="notes-${esc(a.id)}" data-field="notes" data-id="${esc(a.id)}"
                    placeholder="What you still need, who you asked for a reference, what the essay prompt actually says.">${esc(a.notes || '')}</textarea>
          <span class="field__hint">Only you can read these. They are included in your data export.</span>
        </label>

        <label class="field">
          <span class="field__label" for="contacts-${esc(a.id)}">Contacts</span>
          <textarea class="textarea" id="contacts-${esc(a.id)}" data-field="contacts" data-id="${esc(a.id)}"
                    style="min-height:80px" placeholder="Supervisor, referee, programme coordinator.">${esc(a.contacts || '')}</textarea>
        </label>

        ${a.history?.length ? `
          <h3 class="h4" style="margin-top:1.5rem">Progress history</h3>
          <ol class="timeline">
            ${a.history.map((event) => `
              <li>
                <b>${esc(event.from ? `${stageLabel(event.from)} → ${stageLabel(event.to)}` : stageLabel(event.to))}</b>
                <time datetime="${esc(event.at)}">${esc(formatDate(event.at))}${event.note ? ` · ${esc(event.note)}` : ''}</time>
              </li>`).join('')}
          </ol>` : ''}

        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.5rem">
          <a class="btn btn--ghost btn--sm" href="/opportunity.html?id=${esc(a.opportunityId)}">Open the listing</a>
          <button class="btn btn--danger btn--sm" type="button" data-remove-app="${esc(a.id)}">Remove from tracker</button>
        </div>
      </div>
    </details>
  </article>`;
}

function paint() {
  const visible = filter === 'all' ? applications : applications.filter((a) => groupOf(a.stage) === filter);
  countNode.textContent = visible.length === 1 ? '1 application' : `${visible.length} applications`;

  listNode.innerHTML = visible.length
    ? visible.map(card).join('')
    : `<div class="empty">
         <h3>${applications.length ? 'Nothing at that stage' : 'The tracker is empty'}</h3>
         <p>${applications.length
           ? 'Try another stage filter.'
           : 'Add an opportunity from its listing page or from your saved list, and Radar will set up a document checklist for you.'}</p>
         <a class="btn btn--primary" href="/app/saved.html">Open your saved list</a>
       </div>`;

  /* Deep links from the dashboard open the right card. */
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    target?.querySelector('details')?.setAttribute('open', '');
    target?.scrollIntoView({ block: 'center' });
  }
}

async function reload() {
  applications = await get('/api/applications');
  paint();
}

/* ------------------------------------------------------------ handlers */

filterBar.addEventListener('click', (event) => {
  const button = event.target.closest('[data-group]');
  if (!button) return;
  filter = button.dataset.group;
  $$('#stage-filters .filter').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
  paint();
});

listNode.addEventListener('change', async (event) => {
  const target = event.target;

  if (target.dataset.stageSelect) {
    const id = target.dataset.stageSelect;
    const stage = target.value;
    try {
      const updated = await patch(`/api/applications/${id}`, { stage });
      applications = applications.map((a) => (a.id === id ? updated : a));
      paint();
      announce(`Stage set to ${stageLabel(stage)}.`);
      if (stage === 'submitted') track('application-submit', updated.opportunityId, 'tracker');
      if (['accepted', 'rejected', 'waitlisted', 'not-eligible'].includes(stage)) {
        track('application-outcome', stage, 'tracker');
      }
    } catch (error) { toast(error.message, { tone: 'error' }); }
    return;
  }

  if (target.dataset.check) {
    try {
      await patch(`/api/applications/${target.dataset.id}/checklist/${target.dataset.check}`, { done: target.checked });
      const application = applications.find((a) => a.id === target.dataset.id);
      const item = application?.checklist.find((c) => c.id === target.dataset.check);
      if (item) item.done = target.checked;
      const bar = target.closest('[data-application]')?.querySelector('.progress span');
      if (bar && application) {
        const done = application.checklist.filter((c) => c.done).length;
        bar.style.width = `${Math.round((done / application.checklist.length) * 100)}%`;
      }
    } catch (error) { toast(error.message, { tone: 'error' }); }
    return;
  }

  if (target.dataset.field && target.type === 'date') {
    await patch(`/api/applications/${target.dataset.id}`, { [target.dataset.field]: target.value || null })
      .catch((error) => toast(error.message, { tone: 'error' }));
  }
});

/* Notes save when the field loses focus, so typing is never interrupted. */
listNode.addEventListener('focusout', async (event) => {
  const target = event.target;
  if (!target.dataset?.field || target.tagName !== 'TEXTAREA') return;
  try {
    await patch(`/api/applications/${target.dataset.id}`, { [target.dataset.field]: target.value });
    const application = applications.find((a) => a.id === target.dataset.id);
    if (application) application[target.dataset.field] = target.value;
    announce('Saved.');
  } catch (error) { toast(error.message, { tone: 'error' }); }
});

listNode.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-add-item]');
  if (!form) return;
  event.preventDefault();
  const id = form.dataset.addItem;
  const input = form.querySelector('[name="label"]');
  const label = input.value.trim();
  if (!label) return;
  try {
    const updated = await post(`/api/applications/${id}/checklist`, { label });
    applications = applications.map((a) => (a.id === id ? updated : a));
    paint();
    document.getElementById(id)?.querySelector('details')?.setAttribute('open', '');
    document.getElementById(`new-item-${id}`)?.focus();
    announce(`Added ${label}.`);
  } catch (error) { toast(error.message, { tone: 'error' }); }
});

listNode.addEventListener('click', async (event) => {
  const removeItem = event.target.closest('[data-remove-item]');
  if (removeItem) {
    const id = removeItem.dataset.id;
    try {
      const updated = await del(`/api/applications/${id}/checklist/${removeItem.dataset.removeItem}`);
      applications = applications.map((a) => (a.id === id ? updated : a));
      paint();
      document.getElementById(id)?.querySelector('details')?.setAttribute('open', '');
    } catch (error) { toast(error.message, { tone: 'error' }); }
    return;
  }

  const removeApp = event.target.closest('[data-remove-app]');
  if (removeApp) {
    const id = removeApp.dataset.removeApp;
    const application = applications.find((a) => a.id === id);
    if (!confirm(`Remove "${application?.opportunity?.title || 'this application'}" from the tracker? Your notes and checklist for it are deleted. The opportunity stays saved.`)) return;
    try {
      await del(`/api/applications/${id}`);
      applications = applications.filter((a) => a.id !== id);
      paint();
      announce('Removed from the tracker.');
    } catch (error) { toast(error.message, { tone: 'error' }); }
  }
});

(async function init() {
  if (!await requireAuth()) return;
  try { await reload(); } catch (error) {
    countNode.textContent = 'The tracker did not load.';
    toast(error.message, { tone: 'error' });
  }
}());
