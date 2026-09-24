/**
 * The opportunity directory: search, filters, sort, and live result counts.
 *
 * Filter state lives in the URL, so a filtered view can be shared, bookmarked
 * and reached with the back button.
 */
import { get, track } from './api.js';
import { $, $$, opportunityCard, announce, loadSession } from './ui.js';
import { TYPES, LEVELS, REGIONS } from './config.js';

const results = $('#results');
const countNode = $('#result-count');
const form = $('#directory-tools');
const filtersPanel = $('#filters');
const filtersToggle = $('#filters-toggle');

const controls = {
  q: $('#q'),
  sort: $('#sort'),
  level: $('#level'),
  region: $('#region'),
  funding: $('#funding'),
  status: $('#status'),
};

let type = 'all';
let debounce;

/* ------------------------------------------------------------ build UI */
$('#type-filters').innerHTML = [{ value: 'all', label: 'All signals' }, ...TYPES]
  .map(({ value, label }) => `<button class="filter" type="button" data-type="${value}" aria-pressed="${value === 'all'}">${label}</button>`)
  .join('');

controls.level.innerHTML = ['<option value="all">Any level</option>',
  ...LEVELS.map((l) => `<option value="${l.value}">${l.label}</option>`)].join('');
controls.region.innerHTML = ['<option value="all">Anywhere</option>',
  ...REGIONS.map((r) => `<option value="${r}">${r}</option>`)].join('');

/* Filters collapse on small screens but are always in the DOM for search. */
const narrow = window.matchMedia('(max-width:760px)');
const applyCollapse = () => {
  if (!filtersToggle) return;
  const collapsed = narrow.matches && filtersToggle.getAttribute('aria-expanded') !== 'true';
  filtersPanel.hidden = collapsed;
};
filtersToggle?.addEventListener('click', () => {
  const open = filtersToggle.getAttribute('aria-expanded') === 'true';
  filtersToggle.setAttribute('aria-expanded', String(!open));
  applyCollapse();
});
narrow.addEventListener('change', applyCollapse);
applyCollapse();

/* -------------------------------------------------------- URL <-> state */
function readUrl() {
  const params = new URLSearchParams(location.search);
  type = params.get('type') || 'all';
  for (const [key, node] of Object.entries(controls)) {
    const value = params.get(key);
    if (value !== null) node.value = value;
  }
  $$('#type-filters .filter').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.type === type));
  });
}

function writeUrl({ replace = false } = {}) {
  const params = new URLSearchParams();
  if (type !== 'all') params.set('type', type);
  for (const [key, node] of Object.entries(controls)) {
    const value = node.value;
    if (value && value !== 'all' && !(key === 'sort' && value === 'match')) params.set(key, value);
  }
  const url = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

/* --------------------------------------------------------------- render */
function skeleton() {
  results.setAttribute('aria-busy', 'true');
  results.innerHTML = Array.from({ length: 4 }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-line" style="width:35%"></div>
      <div class="skeleton skeleton-line" style="width:80%;height:26px"></div>
      <div class="skeleton skeleton-line" style="width:60%"></div>
      <div class="skeleton skeleton-line" style="width:90%"></div>
      <div class="skeleton skeleton-line" style="width:70%"></div>
    </div>`).join('');
}

async function load({ announceResults = false } = {}) {
  skeleton();
  const query = {
    type,
    q: controls.q.value.trim(),
    sort: controls.sort.value,
    level: controls.level.value,
    region: controls.region.value,
    funding: controls.funding.value,
    status: controls.status.value,
  };

  try {
    const session = await loadSession();
    const data = await get('/api/opportunities', query);
    results.setAttribute('aria-busy', 'false');

    if (!data.results.length) {
      results.innerHTML = `
        <div class="empty">
          <h3>Nothing matches those filters.</h3>
          <p>Try removing a filter, or search a broader term. If the thing you are looking for should be in Radar and is not, tell us — the catalogue grows from requests.</p>
          <div style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap">
            <button class="btn btn--primary" type="button" id="clear-empty">Clear all filters</button>
            <a class="btn btn--ghost" href="/contact.html?subject=Suggest">Suggest an opportunity</a>
          </div>
        </div>`;
      $('#clear-empty')?.addEventListener('click', reset);
    } else {
      results.innerHTML = data.results.map((o) => opportunityCard(o, { showWhy: data.personalised })).join('');
    }

    const personalNote = data.personalised
      ? 'scored against your profile'
      : session?.user
        ? 'complete your profile to see match scores'
        : 'sign in to see how each one matches you';
    countNode.textContent = `${data.count} of ${data.total} listings — ${personalNote}`;
    if (announceResults) announce(`${data.count} opportunities found.`);
    if (query.q) track('search', query.q.slice(0, 40), 'directory');
  } catch (error) {
    results.setAttribute('aria-busy', 'false');
    results.innerHTML = `<div class="empty"><h3>The catalogue did not load</h3><p>${error.message}</p><button class="btn btn--ghost" type="button" id="retry">Try again</button></div>`;
    countNode.textContent = 'Could not load the catalogue.';
    $('#retry')?.addEventListener('click', () => load());
  }
}

function reset() {
  type = 'all';
  controls.q.value = '';
  controls.sort.value = 'match';
  ['level', 'region', 'funding', 'status'].forEach((key) => { controls[key].value = 'all'; });
  $$('#type-filters .filter').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.type === 'all'));
  });
  writeUrl();
  load({ announceResults: true });
}

/* ---------------------------------------------------------------- wire */
form.addEventListener('submit', (event) => event.preventDefault());

controls.q.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { writeUrl({ replace: true }); load({ announceResults: true }); }, 260);
});

['sort', 'level', 'region', 'funding', 'status'].forEach((key) => {
  controls[key].addEventListener('change', () => {
    writeUrl();
    load({ announceResults: true });
    track('filter', `${key}:${controls[key].value}`, 'directory');
  });
});

$('#type-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-type]');
  if (!button) return;
  type = button.dataset.type;
  $$('#type-filters .filter').forEach((other) => {
    other.setAttribute('aria-pressed', String(other === button));
  });
  writeUrl();
  load({ announceResults: true });
  track('filter', `type:${type}`, 'directory');
});

$('#reset-filters')?.addEventListener('click', reset);
window.addEventListener('popstate', () => { readUrl(); load(); });
document.addEventListener('radar:save-changed', () => { /* counts stay correct without a reload */ });

readUrl();
load();
