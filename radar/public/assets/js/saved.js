/** Saved opportunities, newest first, with a one-click calendar export. */
import { get, track } from './api.js?v=1ed1068b03';
import { $, opportunityCard, requireAuth, toast, announce } from './ui.js?v=1ed1068b03';

const results = $('#saved-results');
const count = $('#saved-count');

async function load() {
  const saved = await get('/api/saves');
  count.textContent = saved.length === 1 ? '1 saved opportunity' : `${saved.length} saved opportunities`;
  results.innerHTML = saved.length
    ? saved.map((o) => opportunityCard(o)).join('')
    : `<div class="empty">
         <h3>Nothing saved yet</h3>
         <p>Save anything worth a second look. Saved opportunities show up here, on your dashboard and on your deadline calendar.</p>
         <a class="btn btn--primary" href="/opportunities.html">Open the directory</a>
       </div>`;
}

$('#export-all')?.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = '/api/calendar/me.ics';
  link.download = 'radar-deadlines.ics';
  link.click();
  track('calendar-export', 'all', 'saved');
  announce('Calendar file downloading with every dated deadline you have saved.');
});

/* Removing a save should empty the page, not leave a stale card behind. */
document.addEventListener('radar:save-changed', (event) => {
  if (!event.detail.saved) load().catch(() => {});
});

(async function init() {
  if (!await requireAuth()) return;
  try { await load(); } catch (error) { toast(error.message, { tone: 'error' }); }
}());
