/**
 * Profile onboarding: six steps, one form, no data lost between them.
 *
 * Each step is a fieldset in the page; only the current one is shown. Every
 * step saves as you go, so leaving halfway through does not throw the answers
 * away, and returning later pre-fills what is already known.
 */
import { get, put, track } from './api.js';
import { $, $$, handleForm, requireAuth, announce, toast } from './ui.js';
import { LEVELS, SUBJECTS, GOALS, REGIONS, FUNDING_NEEDS, EXPERIENCE, TYPES } from './config.js';

const form = $('#onboarding-form');
const steps = $$('.onboard-step');
const heading = $('#step-heading');
const counter = $('#step-counter');
const progress = $('#onboard-progress');
const backButton = $('#onboard-back');
const nextButton = $('#onboard-next');

const COUNTRIES = [
  'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Egypt',
  'Lebanon', 'India', 'Pakistan', 'Bangladesh', 'United Kingdom', 'United States', 'Canada',
  'Germany', 'France', 'Netherlands', 'Switzerland', 'Sweden', 'Italy', 'Spain', 'Turkey',
  'Nigeria', 'Kenya', 'South Africa', 'Singapore', 'Malaysia', 'China', 'Japan', 'South Korea',
  'Australia', 'New Zealand', 'Brazil',
];

const titleCase = (value) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const radios = (name, options) => options.map(({ value, label }) => `
  <label class="option"><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`).join('');

const checks = (name, options) => options.map(({ value, label }) => `
  <label class="option"><input type="checkbox" name="${name}" value="${value}"><span>${label}</span></label>`).join('');

$('#level-options').innerHTML = radios('level', LEVELS);
$('#subject-options').innerHTML = checks('subjects', SUBJECTS.map((s) => ({ value: s, label: titleCase(s) })));
$('#goal-options').innerHTML = checks('goals', GOALS);
$('#region-options').innerHTML = checks('regions', REGIONS.map((r) => ({ value: r, label: r })));
$('#funding-options').innerHTML = radios('fundingNeed', FUNDING_NEEDS);
$('#experience-options').innerHTML = radios('experience', EXPERIENCE);
$('#type-options').innerHTML = checks('types', TYPES.map((t) => ({ value: t.value, label: t.label })));
$('#country-list').innerHTML = COUNTRIES.map((c) => `<option value="${c}">`).join('');

const STEP_TITLES = [
  'Where are you in your education?',
  'What are you actually interested in?',
  'What are you building toward?',
  'Where are you, and where would you go?',
  'How much does funding matter?',
  'What are you looking for?',
];

let current = 0;

function paint() {
  steps.forEach((step, index) => { step.hidden = index !== current; });
  heading.textContent = STEP_TITLES[current];
  counter.textContent = `Step ${current + 1} of ${steps.length}`;
  progress.style.width = `${((current + 1) / steps.length) * 100}%`;
  backButton.hidden = current === 0;
  nextButton.textContent = current === steps.length - 1 ? 'Save and see my matches' : 'Continue';
  announce(`Step ${current + 1} of ${steps.length}. ${STEP_TITLES[current]}`);
  steps[current].querySelector('input, select, textarea')?.focus();
}

/** Reads the whole form, including the multi-value checkbox groups. */
function collect() {
  const data = new FormData(form);
  return {
    level: data.get('level') || null,
    yearOrGrade: data.get('yearOrGrade') || null,
    country: data.get('country') || null,
    citizenship: data.get('citizenship') || null,
    subjects: data.getAll('subjects'),
    goals: data.getAll('goals'),
    types: data.getAll('types'),
    regions: data.getAll('regions'),
    fundingNeed: data.get('fundingNeed') || null,
    experience: data.get('experience') || null,
    availability: data.get('availability') || null,
    willingToTravel: data.get('willingToTravel') === '1',
    notes: data.get('notes') || '',
  };
}

function prefill(profile) {
  if (!profile) return;
  const set = (name, value) => {
    const node = form.elements[name];
    if (node && !node.length) node.value = value ?? '';
  };
  set('yearOrGrade', profile.yearOrGrade);
  set('country', profile.country);
  set('citizenship', profile.citizenship);
  set('availability', profile.availability);
  set('notes', profile.notes);

  const check = (name, values) => {
    (values || []).forEach((value) => {
      const node = form.querySelector(`[name="${name}"][value="${CSS.escape(String(value))}"]`);
      if (node) node.checked = true;
    });
  };
  check('level', profile.level ? [profile.level] : []);
  check('subjects', profile.subjects);
  check('goals', profile.goals);
  check('types', profile.types);
  check('regions', profile.regions);
  check('fundingNeed', profile.fundingNeed ? [profile.fundingNeed] : []);
  check('experience', profile.experience ? [profile.experience] : []);
  const travel = form.querySelector('[name="willingToTravel"]');
  if (travel) travel.checked = profile.willingToTravel !== false;
}

/** Step-level validation, stated in terms the student can act on. */
function validate() {
  const values = collect();
  if (current === 0 && !values.level) return 'Choose the level you are at.';
  if (current === 1 && !values.subjects.length) return 'Pick at least one subject — this carries the most weight in matching.';
  if (current === 3 && !values.country) return 'Enter the country you live in.';
  return null;
}

let saveTimer;
const saveQuietly = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { put('/api/profile', collect()).catch(() => {}); }, 600);
};
form.addEventListener('change', saveQuietly);

backButton.addEventListener('click', () => {
  if (current === 0) return;
  current -= 1;
  paint();
});

handleForm(form, async () => {
  const problem = validate();
  if (problem) {
    const error = new Error(problem);
    throw error;
  }
  clearTimeout(saveTimer);
  const profile = await put('/api/profile', collect());

  if (current < steps.length - 1) {
    current += 1;
    paint();
    return;
  }

  if (profile.completedAt) track('profile-complete', '', 'onboarding');
  toast('Profile saved. Your matches are ready.');
  location.href = '/app/dashboard.html';
}, { pendingLabel: 'Saving…' });

(async function init() {
  const session = await requireAuth();
  if (!session) return;
  try {
    prefill(await get('/api/profile'));
  } catch { /* an empty form is a fine starting point */ }
  paint();
}());
