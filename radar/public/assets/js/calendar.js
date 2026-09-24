/**
 * Deadline calendar: everything dated that a student is tracking, the
 * reminders they set, and export into the calendar they already use.
 *
 * Deadlines are shown as the organiser published them. Where the organiser
 * names a closing time in its own zone, that is stated rather than silently
 * converted, because a converted time that is wrong is worse than no time.
 */
import { get, post, del, track } from './api.js?v=1ed1068b03';
import { $, esc, formatDate, relativeDays, requireAuth, toast, announce, handleForm } from './ui.js?v=1ed1068b03';
import { daysUntil } from './matching.js?v=1ed1068b03';
import { SITE } from './config.js?v=1ed1068b03';

const upcoming = $('#calendar-upcoming');
const undated = $('#calendar-undated');
const reminderList = $('#calendar-reminders');

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
$('#calendar-note').innerHTML = `
  Your device is set to <strong>${esc(zone)}</strong>. Deadlines are shown on the organiser's own date, and exported as
  all-day entries so a time-zone difference can never move one to the wrong day.
  ${SITE.automaticDeadlineMonitoring ? '' : 'Radar does not watch organiser pages for changes yet — check the official page before you rely on a date.'}`;

function monthGroups(items) {
  const groups = new Map();
  for (const o of items) {
    const key = o.deadline.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }
  return groups;
}

function row(o) {
  const days = daysUntil(o.deadline);
  const tone = days <= 21 ? 'status--closing-soon' : 'status--open';
  return `
    <li style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)">
      <div style="min-width:0">
        <b style="font-weight:500"><a href="/opportunity.html?id=${esc(o.id)}">${esc(o.title)}</a></b>
        <p class="meta" style="margin:.3rem 0 0">${esc(o.org)}${o.deadlineLabel ? ` · ${esc(o.deadlineLabel)}` : ''}</p>
      </div>
      <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
        <span class="status ${tone}">${days === 0 ? 'today' : esc(relativeDays(o.deadline))}</span>
        <button class="btn btn--quiet btn--sm" type="button" data-remind="${esc(o.id)}">Remind me</button>
        <a class="btn btn--quiet" href="/api/calendar/${esc(o.id)}.ics" download>.ics</a>
      </div>
    </li>`;
}

function paintSaved(saved) {
  const dated = saved.filter((o) => o.deadline && daysUntil(o.deadline) >= 0)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const past = saved.filter((o) => o.deadline && daysUntil(o.deadline) < 0);
  const none = saved.filter((o) => !o.deadline);

  upcoming.innerHTML = dated.length
    ? Array.from(monthGroups(dated).entries()).map(([month, items]) => `
        <section style="margin-bottom:2rem">
          <h3 class="h4" style="color:var(--signal)">${esc(new Date(`${month}-01T12:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</h3>
          <ul style="list-style:none;margin:.8rem 0 0;padding:0">${items.map(row).join('')}</ul>
        </section>`).join('')
      + (past.length ? `<p class="meta">${past.length} saved ${past.length === 1 ? 'deadline has' : 'deadlines have'} already passed.</p>` : '')
    : `<div class="panel"><p class="lede" style="font-size:14.5px">No upcoming dated deadlines. Save something with a published date and it will appear here.</p></div>`;

  undated.innerHTML = none.length
    ? `<ul style="list-style:none;margin:0;padding:0">${none.map((o) => `
        <li style="padding:12px 0;border-bottom:1px solid var(--line)">
          <b style="font-weight:500"><a href="/opportunity.html?id=${esc(o.id)}">${esc(o.title)}</a></b>
          <p class="meta" style="margin:.3rem 0 0">${esc(o.deadlineLabel || 'No date published')}</p>
        </li>`).join('')}</ul>`
    : '<p class="meta">Nothing saved without a date.</p>';
}

function paintReminders(reminders) {
  reminderList.innerHTML = reminders.length
    ? `<ul style="list-style:none;margin:0;padding:0">${reminders.map((r) => `
        <li style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)">
          <div>
            <b style="font-weight:500">${esc(r.label || 'Reminder')}</b>
            <p class="meta" style="margin:.3rem 0 0">${esc(formatDate(r.remindOn))} · ${esc(r.opportunity?.title || '')}</p>
          </div>
          <button class="btn btn--quiet btn--sm" type="button" data-delete-reminder="${esc(r.id)}">Remove</button>
        </li>`).join('')}</ul>`
    : `<p class="lede" style="font-size:14.5px">No reminders set. Add one from any listing, or from the deadline list above.</p>
       <p class="meta" style="margin-top:.8rem">Reminders appear on your dashboard when they come due. Email and browser notifications are not built yet.</p>`;
}

async function reload() {
  const [saved, reminders] = await Promise.all([get('/api/saves'), get('/api/reminders')]);
  paintSaved(saved);
  paintReminders(reminders);
  return saved;
}

/* ------------------------------------------------------------- actions */

$('#download-ics').addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = '/api/calendar/me.ics';
  link.download = 'radar-deadlines.ics';
  link.click();
  track('calendar-export', 'all', 'calendar');
  announce('Downloading a calendar file with every dated deadline you have saved.');
});

$('#copy-subscribe').addEventListener('click', async () => {
  const url = `${location.origin}/api/calendar/me.ics`;
  try {
    await navigator.clipboard.writeText(url);
    toast('Feed URL copied. Paste it into Google or Apple Calendar as a subscription.');
  } catch {
    toast(url, { tone: 'error' });
  }
});

document.addEventListener('click', async (event) => {
  const remind = event.target.closest('[data-remind]');
  if (remind) {
    const when = prompt('Remind me on (YYYY-MM-DD):', new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    if (!when) return;
    try {
      await post('/api/reminders', { opportunityId: remind.dataset.remind, remindOn: when, label: 'Deadline approaching' });
      track('reminder-set', remind.dataset.remind, 'calendar');
      toast('Reminder set.');
      await reload();
    } catch (error) { toast(error.message, { tone: 'error' }); }
    return;
  }

  const remove = event.target.closest('[data-delete-reminder]');
  if (remove) {
    try {
      await del(`/api/reminders/${remove.dataset.deleteReminder}`);
      await reload();
      announce('Reminder removed.');
    } catch (error) { toast(error.message, { tone: 'error' }); }
  }
});

(async function init() {
  if (!await requireAuth()) return;
  try { await reload(); } catch (error) { toast(error.message, { tone: 'error' }); }
}());
