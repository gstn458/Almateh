/**
 * The public forms: report a listing, contact, and the waitlist.
 * Each one says plainly what happens to the information it collects.
 */
import { get, post, track } from './api.js?v=1ed1068b03';
import { $, $$, esc, handleForm, announce } from './ui.js?v=1ed1068b03';
import { REPORT_REASONS } from './config.js?v=1ed1068b03';

/* ------------------------------------------------------ report a listing */
const reportForm = $('#report-form');
if (reportForm) {
  const select = $('#report-opportunity');
  const reasons = $('#report-reasons');

  reasons.innerHTML = REPORT_REASONS.map((reason, index) => `
    <label class="option">
      <input type="radio" name="reason" value="${esc(reason)}"${index === 0 ? ' required' : ''}>
      <span>${esc(reason)}</span>
    </label>`).join('');

  get('/api/opportunities', { sort: 'title' }).then((data) => {
    const preselect = new URLSearchParams(location.search).get('id');
    select.innerHTML = ['<option value="">Not about one specific listing</option>',
      ...data.results.map((o) => `<option value="${esc(o.id)}"${o.id === preselect ? ' selected' : ''}>${esc(o.title)} — ${esc(o.org)}</option>`)].join('');
  }).catch(() => {
    select.innerHTML = '<option value="">Could not load the catalogue — describe the listing below</option>';
  });

  handleForm(reportForm, async (values) => {
    if (!values.reason) {
      const error = new Error('Choose what is wrong with the listing.');
      error.field = 'reason';
      throw error;
    }
    await post('/api/reports', values);
    track('report-submit', values.opportunityId || 'general', 'report');
    reportForm.hidden = true;
    const success = reportForm.querySelector('[data-form-success]');
    success.hidden = false;
    success.textContent = 'Report received. It goes into the review queue, and the listing is corrected or marked unverified until it is checked. Thank you — this is the single most useful thing anyone does for the catalogue.';
    success.setAttribute('tabindex', '-1');
    reportForm.parentNode.insertBefore(success, reportForm);
    success.focus();
    announce('Report received.');
  }, { pendingLabel: 'Sending…' });
}

/* -------------------------------------------------------------- contact */
function wireMessageForm(form, successText) {
  if (!form) return;
  handleForm(form, async (values) => {
    await post('/api/messages', values);
    const success = form.querySelector('[data-form-success]');
    form.querySelectorAll('input:not([type=hidden]), textarea, select').forEach((node) => { node.value = ''; });
    success.hidden = false;
    success.textContent = successText;
    success.setAttribute('tabindex', '-1');
    success.focus();
    announce(successText);
  }, { pendingLabel: 'Sending…' });
}

wireMessageForm($('#contact-form'), 'Message sent. You will get a reply at the address you gave, and it is not used for anything else.');
wireMessageForm($('#waitlist-form'), 'You are on the list. One email when a paid tier actually launches — nothing else.');

/* Pre-select a contact subject when the link carries one. */
const subject = new URLSearchParams(location.search).get('subject');
if (subject) {
  const select = $('#contact-subject');
  const option = select && Array.from(select.options).find((o) => o.text.toLowerCase().includes(subject.toLowerCase()));
  if (option) select.value = option.value;
}

/* The pricing page's "tell me when it exists" buttons feed the same form. */
$$('[data-waitlist]').forEach((button) => {
  button.addEventListener('click', () => {
    const tier = button.dataset.waitlist;
    const field = $('#waitlist-subject');
    if (field) field.value = `${tier} waitlist`;
    $('#waitlist-email')?.focus();
    $('#waitlist-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});
