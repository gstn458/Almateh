/**
 * A full opportunity page: everything a student needs to decide whether to
 * spend a weekend on this, before they leave for the organiser's site.
 */
import { get, post, del, track } from './api.js';
import {
  $, esc, opportunityCard, deadlineText, formatDate, relativeDays,
  verificationText, statusChip, announce, toast, loadSession, handleForm,
} from './ui.js';
import { daysUntil, STATUS_LABEL } from './matching.js';
import { SITE } from './config.js';

const root = $('#opportunity-root');
const body = $('#opportunity-body');
const titleNode = $('#opportunity-title');
const crumb = $('#crumb-title');

const id = new URLSearchParams(location.search).get('id');

if (!id) {
  location.replace('/opportunities.html');
}

/** The countdown, including the honest "no date" and "closed" cases. */
function countdown(o) {
  if (!o.deadline) {
    return `<p class="countdown countdown--closed"><b>—</b><span>${esc(o.deadlineLabel || 'No fixed date published')}</span></p>`;
  }
  const days = daysUntil(o.deadline);
  if (days < 0) {
    return `<p class="countdown countdown--closed"><b>Closed</b><span>${esc(formatDate(o.deadline))} · ${esc(relativeDays(o.deadline))}</span></p>`;
  }
  const tone = days <= 21 ? ' countdown--soon' : '';
  return `<p class="countdown${tone}"><b class="tnum">${days}</b><span>${days === 1 ? 'day' : 'days'} left · closes ${esc(formatDate(o.deadline))}</span></p>`;
}

function list(items, fallback) {
  if (!items?.length) return `<p class="lede" style="font-size:14.5px">${esc(fallback)}</p>`;
  return `<ul class="stack" style="--gap:.5rem;margin:0;padding-left:1.1rem;color:var(--muted);font-size:14.5px;line-height:1.6">
    ${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function matchPanel(o, session) {
  const match = o.match || {};
  if (match.score === null || match.score === undefined) {
    return session?.user
      ? `<div class="notice notice--info">
           <strong>No match score yet.</strong> Finish your profile and Radar can tell you how this lines up with your level, subjects, funding needs and citizenship.
           <a href="/app/onboarding.html">Complete your profile</a>.
         </div>`
      : `<div class="notice notice--info">
           <strong>Sign in to see how this matches you.</strong> Radar scores every listing against your level, subjects, goals, location, funding needs and citizenship — and shows its reasoning.
           <a href="/app/signup.html">Create a free account</a>.
         </div>`;
  }
  return `
    <div class="panel">
      <div style="display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap">
        <p class="countdown" style="margin:0"><b class="tnum">${match.score}%</b><span>match</span></p>
        <p class="meta" style="margin:0">Scored against your profile</p>
      </div>
      ${match.reasons?.length ? `
        <h3 class="h4" style="margin-top:1.5rem">Why this matched</h3>
        <ul class="stack" style="--gap:.5rem;margin:0;padding-left:1.1rem;color:var(--muted);font-size:14.5px;line-height:1.6">
          ${match.reasons.map((reason) => `<li>${esc(reason)}</li>`).join('')}
        </ul>` : ''}
      ${match.blockers?.length ? `
        <h3 class="h4" style="margin-top:1.5rem">What counts against it</h3>
        <ul class="stack" style="--gap:.5rem;margin:0;padding-left:1.1rem;color:var(--warn);font-size:14.5px;line-height:1.6">
          ${match.blockers.map((blocker) => `<li>${esc(blocker)}</li>`).join('')}
        </ul>` : ''}
      <p class="form-note">A score is not a ruling on eligibility. The organisation decides that.
        <a href="/app/settings.html#profile" style="color:var(--signal);text-decoration:underline">Adjust your profile</a> to change what Radar recommends.</p>
    </div>`;
}

function render({ opportunity: o, similar, saved, application }, session) {
  document.title = `${o.title} — ${o.org} | Radar`;
  titleNode.textContent = o.title;
  crumb.textContent = o.title;

  /* Per-listing structured data so a shared link previews properly. */
  const jsonLd = document.createElement('script');
  jsonLd.type = 'application/ld+json';
  jsonLd.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': o.type === 'scholarship' ? 'EducationalOccupationalProgram' : 'Event',
    name: o.title,
    description: o.summary,
    url: `${SITE.origin}/opportunity.html?id=${o.id}`,
    provider: { '@type': 'Organization', name: o.org, url: o.officialUrl },
    ...(o.deadline ? { applicationDeadline: o.deadline, startDate: o.deadline } : {}),
    ...(o.type !== 'scholarship' ? { eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode', location: { '@type': 'Place', name: o.location } } : {}),
  });
  document.head.append(jsonLd);

  const verification = verificationText(o);
  const closed = (o.liveStatus || o.status) === 'closed';

  body.setAttribute('aria-busy', 'false');
  body.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-bottom:1.5rem">
      ${statusChip(o)}
      <span class="chip">${esc(o.type)}</span>
      <span class="chip">${esc(o.field)}</span>
      ${o.recurring === 'annual' ? '<span class="chip">Runs annually</span>' : ''}
      <span class="chip chip--${verification.tone === 'ok' ? 'ok' : 'warn'}">${esc(verification.label)}</span>
    </div>

    <p class="lede" style="font-size:18px;max-width:64ch">${esc(o.summary)}</p>
    <p class="meta" style="margin-top:.8rem">${esc(o.org)} · ${esc(o.location)}</p>

    ${o.verificationStatus !== 'verified' ? `
      <p class="notice" style="margin-top:2rem">
        <strong>Radar has not verified this listing yet.</strong> The organisation and its official page are known, but nobody has re-read the details this cycle.
        Treat the deadline and eligibility below as a starting point and confirm them on the official page.
      </p>` : ''}

    ${closed ? `
      <p class="notice" style="margin-top:2rem">
        <strong>This cycle has closed.</strong> ${o.recurring === 'annual'
          ? 'It usually runs annually, so it is kept here to help you plan the next round.'
          : 'Check the official page to see whether it will run again.'}
      </p>` : ''}

    <div class="grid grid--2" style="background:transparent;gap:2rem;margin-top:2.5rem;align-items:start">
      <div>
        <div class="panel">
          <h2 class="h4">Deadline</h2>
          ${countdown(o)}
          <dl class="opp__facts" style="margin-top:1.2rem">
            <div><dt>As published</dt><dd>${esc(o.deadlineLabel || '—')}</dd></div>
            <div><dt>Date type</dt><dd>${esc({ fixed: 'Fixed date', variable: 'Varies — set locally or annually', rolling: 'Rolling' }[o.dateType] || o.dateType || '—')}</dd></div>
            ${o.opensAt ? `<div><dt>Opens</dt><dd>${esc(formatDate(o.opensAt))}</dd></div>` : ''}
            <div><dt>Recurring</dt><dd>${esc(o.recurring || 'Unknown')}</dd></div>
          </dl>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.5rem">
            <button class="btn btn--ghost btn--sm" type="button" id="set-reminder"${o.deadline ? '' : ' disabled'}>Set a reminder</button>
            <button class="btn btn--ghost btn--sm" type="button" id="add-calendar"${o.deadline ? '' : ' disabled'}>Add to calendar</button>
          </div>
          ${!o.deadline ? '<p class="form-note">No date to count down to yet, so reminders and calendar export are off for this listing.</p>' : ''}
        </div>

        <div class="panel">
          <h2 class="h4">Eligibility</h2>
          <dl class="opp__facts" style="margin-top:1rem">
            <div><dt>Who</dt><dd>${esc(o.audience)}</dd></div>
            <div><dt>Levels</dt><dd>${esc((o.levels || []).join(', ') || 'Not specified')}</dd></div>
            <div><dt>Citizenship</dt><dd>${esc(o.citizenship || 'Check the official page')}</dd></div>
            <div><dt>Experience</dt><dd>${esc(o.experienceLevel || 'Not specified')}</dd></div>
            <div><dt>Where</dt><dd>${esc(o.location)}</dd></div>
          </dl>
        </div>

        <div class="panel">
          <h2 class="h4">Funding and what you get</h2>
          <p class="lede" style="font-size:14.5px">${esc(o.fundingDetails || 'Funding details are not published — confirm on the official page.')}</p>
          <h3 class="h4" style="margin-top:1.4rem">Benefits</h3>
          ${list(o.benefits, 'Not published.')}
        </div>

        <div class="panel">
          <h2 class="h4">What it actually is</h2>
          <p class="lede" style="font-size:14.5px">${esc(o.description || o.summary)}</p>
        </div>

        <div class="panel">
          <h2 class="h4">Documents you will need</h2>
          ${list(o.documents, 'The organiser has not published a document list.')}
          <h3 class="h4" style="margin-top:1.4rem">How to apply</h3>
          <ol class="stack" style="--gap:.5rem;margin:0;padding-left:1.1rem;color:var(--muted);font-size:14.5px;line-height:1.6">
            ${(o.steps || []).map((step) => `<li>${esc(step)}</li>`).join('')}
          </ol>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2 class="h4">Your next move</h2>
          <div class="stack" style="--gap:.6rem;margin-top:1.2rem">
            <a class="btn btn--primary btn--block" href="${esc(o.applyUrl || o.officialUrl)}"
               target="_blank" rel="noopener noreferrer" id="apply-link">
              Open the official page ↗
            </a>
            <button class="save-btn" type="button" data-save="${esc(o.id)}" aria-pressed="${saved}" style="width:100%;min-height:44px">
              ${saved ? 'Saved' : 'Save for later'}
            </button>
            <button class="btn btn--ghost btn--block" type="button" id="track-btn">
              ${application ? 'Open in tracker' : 'Add to application tracker'}
            </button>
            <button class="btn btn--quiet btn--block" type="button" id="share-btn">Share</button>
          </div>
          <p class="form-note">The organisation's own page is the final authority on dates, rules and how to apply.</p>
        </div>

        ${matchPanel(o, session)}

        <div class="panel">
          <h2 class="h4">Source and checking</h2>
          <dl class="opp__facts" style="margin-top:1rem">
            <div><dt>Source</dt><dd><a href="${esc(o.officialUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--signal);text-decoration:underline">${esc(o.sourceLabel || 'Official page')} ↗</a></dd></div>
            <div><dt>Status</dt><dd>${esc(o.verificationStatus === 'verified' ? 'Verified by Radar' : 'Not yet verified')}</dd></div>
            <div><dt>Last read</dt><dd>${esc(o.verifiedAt ? formatDate(o.verifiedAt) : 'Never')}</dd></div>
            <div><dt>Link check</dt><dd>${esc(o.linkCheckedAt ? `${o.linkStatus || 'ok'} · ${formatDate(o.linkCheckedAt)}` : 'Not checked yet')}</dd></div>
          </dl>
          <p style="margin-top:1.2rem"><a class="btn btn--quiet" href="/report.html?id=${encodeURIComponent(o.id)}">Report a problem with this listing</a></p>
        </div>
      </div>
    </div>

    ${similar?.length ? `
      <section aria-labelledby="similar-heading" style="margin:4rem 0 5rem">
        <h2 class="h3" id="similar-heading">Similar opportunities</h2>
        <div class="results" style="margin-top:1.5rem">
          ${similar.map((s) => opportunityCard(s, { showWhy: false })).join('')}
        </div>
      </section>` : ''}
  `;

  wireActions(o, application);
}

function wireActions(o, application) {
  /* Following an external link is the outcome Radar exists to produce. */
  $('#apply-link')?.addEventListener('click', () => track('external-click', o.id, 'detail'));

  $('#track-btn')?.addEventListener('click', async () => {
    const session = await loadSession();
    if (!session?.user) {
      location.href = `/app/signup.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    if (application) { location.href = `/app/tracker.html#${application.id}`; return; }
    try {
      await post('/api/applications', { opportunityId: o.id, stage: 'researching' });
      track('application-start', o.id, 'detail');
      toast('Added to your tracker with a document checklist.');
      location.href = '/app/tracker.html';
    } catch (error) {
      toast(error.message, { tone: 'error' });
    }
  });

  $('#share-btn')?.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(o.id)}`;
    const share = { title: o.title, text: `${o.title} — ${o.org}`, url };
    try {
      if (navigator.share) await navigator.share(share);
      else { await navigator.clipboard.writeText(url); toast('Link copied.'); }
    } catch { /* the person dismissed the share sheet */ }
  });

  $('#add-calendar')?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = `/api/calendar/${encodeURIComponent(o.id)}.ics`;
    link.download = `${o.slug}.ics`;
    link.click();
    track('calendar-export', o.id, 'detail');
    announce('Calendar file downloading. Open it to add the deadline to your calendar.');
  });

  const dialog = $('#reminder-dialog');
  $('#set-reminder')?.addEventListener('click', async () => {
    const session = await loadSession();
    if (!session?.user) {
      location.href = `/app/signup.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    /* A sensible default: a fortnight before the deadline, or tomorrow if the
       deadline is closer than that. */
    const days = daysUntil(o.deadline);
    const offset = days > 16 ? 14 : 1;
    const when = new Date(`${o.deadline}T12:00:00Z`);
    when.setUTCDate(when.getUTCDate() - offset);
    const input = $('#remind-on');
    input.value = when.toISOString().slice(0, 10);
    input.max = o.deadline;
    input.min = new Date().toISOString().slice(0, 10);
    $('#remind-label').value = `Start work on ${o.title}`;
    dialog.showModal();
  });

  const reminderForm = $('#reminder-form');
  if (reminderForm && !reminderForm.dataset.wired) {
    reminderForm.dataset.wired = '1';
    handleForm(reminderForm, async (values) => {
      await post('/api/reminders', { opportunityId: o.id, remindOn: values.remindOn, label: values.label });
      track('reminder-set', o.id, 'detail');
      dialog.close();
      toast('Reminder set. It appears on your dashboard on that date.');
    }, { pendingLabel: 'Saving…' });
  }
}

(async function init() {
  if (!id) return;
  try {
    const [session, data] = await Promise.all([loadSession(), get(`/api/opportunities/${encodeURIComponent(id)}`)]);
    render(data, session);
    track('detail-view', id, 'detail');
  } catch (error) {
    titleNode.textContent = 'That listing is not here';
    crumb.textContent = 'Not found';
    body.setAttribute('aria-busy', 'false');
    body.innerHTML = `
      <p class="lede">${esc(error.message)}</p>
      <p style="margin-top:2rem"><a class="btn btn--primary" href="/opportunities.html">Back to the directory</a></p>`;
  }
}());
