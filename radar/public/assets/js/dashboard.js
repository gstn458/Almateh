/**
 * The personal dashboard: what is due, what matched, what is in flight.
 * Ordered by urgency rather than by recency — the deadline is the product.
 */
import { get, post, track } from './api.js';
import { $, esc, opportunityCard, formatDate, relativeDays, stageLabel, requireAuth, toast } from './ui.js';
import { daysUntil } from './matching.js';

const stats = $('#dashboard-stats');
const deadlines = $('#dashboard-deadlines');
const matches = $('#dashboard-matches');
const applications = $('#dashboard-applications');

function greet(session) {
  const slot = document.querySelector('[data-user-name-slot]');
  const name = session.user.name?.split(' ')[0];
  if (slot && name) slot.textContent = `, ${name}`;
}

/** Reminders that have come due, shown once and dismissible. */
async function paintReminders() {
  const feed = $('#reminder-feed');
  if (!feed) return;
  let due = [];
  try { due = await get('/api/reminders/due'); } catch { return; }
  if (!due.length) return;

  feed.innerHTML = due.map((reminder) => `
    <div class="notice notice--ok" style="margin-bottom:.75rem" data-reminder="${esc(reminder.id)}">
      <strong>${esc(reminder.label || 'Reminder')}</strong> —
      <a href="/opportunity.html?id=${esc(reminder.opportunity?.id || '')}">${esc(reminder.opportunity?.title || 'an opportunity')}</a>
      ${reminder.opportunity?.deadline ? ` · closes ${esc(formatDate(reminder.opportunity.deadline))} (${esc(relativeDays(reminder.opportunity.deadline))})` : ''}
      <button class="btn btn--quiet btn--sm" type="button" data-ack="${esc(reminder.id)}">Got it</button>
    </div>`).join('');

  feed.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-ack]');
    if (!button) return;
    await post(`/api/reminders/${encodeURIComponent(button.dataset.ack)}/ack`).catch(() => {});
    button.closest('[data-reminder]')?.remove();
  });
}

function paintProfilePrompt(profile) {
  const prompt = $('#profile-prompt');
  if (!prompt || profile?.completedAt) return;
  prompt.innerHTML = `
    <div class="notice notice--info" style="margin-bottom:1.5rem">
      <strong>Your profile is not finished.</strong> Radar can rank the whole catalogue around you and explain every score, but it needs your level, subjects and country first.
      <a href="/app/onboarding.html">Finish it — it takes about three minutes</a>.
    </div>`;
}

function paintStats(saved, apps) {
  const submitted = apps.filter((a) => ['submitted', 'interview', 'accepted', 'waitlisted', 'rejected'].includes(a.stage)).length;
  const active = apps.filter((a) => ['researching', 'preparing', 'drafting', 'ready'].includes(a.stage)).length;
  const soon = saved.filter((o) => {
    const days = daysUntil(o.deadline);
    return days !== null && days >= 0 && days <= 30;
  }).length;

  stats.innerHTML = [
    [saved.length, 'Saved'],
    [active, 'In progress'],
    [submitted, 'Submitted'],
    [soon, 'Closing in 30 days'],
  ].map(([value, label]) => `<div class="stat"><b class="tnum">${value}</b><span>${label}</span></div>`).join('');
}

function paintDeadlines(saved) {
  const dated = saved
    .filter((o) => o.deadline && daysUntil(o.deadline) >= 0)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 6);

  if (!dated.length) {
    deadlines.innerHTML = `
      <div class="panel">
        <p class="lede" style="font-size:14.5px">Nothing you have saved has an upcoming date yet. Save something with a deadline and it will appear here and on your calendar.</p>
        <p style="margin-top:1.2rem"><a class="btn btn--ghost btn--sm" href="/opportunities.html">Find something</a></p>
      </div>`;
    return;
  }

  deadlines.innerHTML = `<ol class="timeline">${dated.map((o) => {
    const days = daysUntil(o.deadline);
    return `<li>
      <b><a href="/opportunity.html?id=${esc(o.id)}">${esc(o.title)}</a></b>
      <time datetime="${esc(o.deadline)}">${esc(formatDate(o.deadline))} · ${esc(relativeDays(o.deadline))}${days <= 21 ? ' · closing soon' : ''}</time>
    </li>`;
  }).join('')}</ol>
  <p style="margin-top:1.5rem"><a class="btn btn--ghost btn--sm" href="/app/calendar.html">Open the calendar</a></p>`;
}

function paintApplications(apps) {
  const active = apps.filter((a) => !['accepted', 'rejected', 'not-eligible'].includes(a.stage)).slice(0, 5);
  if (!active.length) {
    applications.innerHTML = `
      <div class="panel">
        <p class="lede" style="font-size:14.5px">Nothing in the tracker yet. Saving keeps an opportunity; tracking it gives you stages, a document checklist and notes.</p>
        <p style="margin-top:1.2rem"><a class="btn btn--ghost btn--sm" href="/app/saved.html">Track something you saved</a></p>
      </div>`;
    return;
  }

  applications.innerHTML = active.map((a) => {
    const done = (a.checklist || []).filter((c) => c.done).length;
    const total = (a.checklist || []).length;
    return `
      <div class="panel" style="margin-bottom:.75rem">
        <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center">
          <h3 class="h4" style="margin:0"><a href="/app/tracker.html#${esc(a.id)}">${esc(a.opportunity?.title || 'Opportunity')}</a></h3>
          <span class="stage-badge" data-stage="${esc(a.stage)}">${esc(stageLabel(a.stage))}</span>
        </div>
        ${total ? `<div class="progress"><span style="width:${Math.round((done / total) * 100)}%"></span></div>
          <p class="meta">${done} of ${total} documents ready</p>` : ''}
        ${a.opportunity?.deadline ? `<p class="meta">Closes ${esc(formatDate(a.opportunity.deadline))} · ${esc(relativeDays(a.opportunity.deadline))}</p>` : ''}
      </div>`;
  }).join('');
}

(async function init() {
  const session = await requireAuth();
  if (!session) return;
  greet(session);
  paintProfilePrompt(session.profile);
  paintReminders();

  try {
    const [saved, apps, matchData] = await Promise.all([
      get('/api/saves'),
      get('/api/applications'),
      get('/api/matches').catch(() => ({ ready: false, results: [] })),
    ]);

    paintStats(saved, apps);
    paintDeadlines(saved);
    paintApplications(apps);

    if (matchData.ready && matchData.results.length) {
      const savedIds = new Set(saved.map((o) => o.id));
      matches.innerHTML = matchData.results
        .slice(0, 4)
        .map((o) => opportunityCard({ ...o, saved: savedIds.has(o.id) }))
        .join('');
    } else {
      matches.innerHTML = `
        <div class="empty">
          <h3>Matches need a profile</h3>
          <p>Answer six short questions and Radar will rank the whole catalogue around you, with the reasoning shown on every result.</p>
          <a class="btn btn--primary" href="/app/onboarding.html">Build your profile</a>
        </div>`;
    }
  } catch (error) {
    toast(error.message || 'Some of your dashboard did not load.', { tone: 'error' });
  }
  track('detail-view', 'dashboard', 'app');
}());
