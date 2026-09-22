/**
 * iCalendar export. Produces files that Google Calendar, Apple Calendar and
 * Outlook all accept, for one deadline or for everything a student tracks.
 *
 * Deadlines are written as all-day events in UTC with the organiser's date
 * kept intact, because a deadline belongs to the organiser's day, not to the
 * student's time zone. The description says which time zone actually governs.
 */
const fold = (line) => {
  const out = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  out.push(rest);
  return out.join('\r\n');
};

const esc = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const stamp = (date) => `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
const dateOnly = (iso) => iso.replace(/-/g, '');

const plusDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** One VEVENT per deadline, with a one-week and a one-day alarm. */
export function buildIcs(opportunities, { name = 'Radar deadlines', origin = '' } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Radar//Opportunity deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
  ];

  for (const o of opportunities) {
    if (!o.deadline) continue;
    const description = [
      o.summary,
      '',
      `Organisation: ${o.org}`,
      o.deadlineLabel ? `Deadline as published: ${o.deadlineLabel}` : '',
      o.deadlineLabel && /ET|GMT|UTC|pm|am/i.test(o.deadlineLabel)
        ? 'This is an all-day entry. The organiser’s own closing time governs.'
        : '',
      `Official page: ${o.officialUrl}`,
      origin ? `Radar listing: ${origin}/opportunity.html?id=${o.id}` : '',
      '',
      'Radar does not control this deadline. Confirm it on the official page before relying on it.',
    ].filter(Boolean).join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${o.id}@radar`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART;VALUE=DATE:${dateOnly(o.deadline)}`,
      `DTEND;VALUE=DATE:${dateOnly(plusDays(o.deadline, 1))}`,
      fold(`SUMMARY:${esc(`${o.title} — deadline`)}`),
      fold(`DESCRIPTION:${esc(description)}`),
      fold(`URL:${esc(o.applyUrl || o.officialUrl)}`),
      fold(`LOCATION:${esc(o.location || '')}`),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${esc(`One week until ${o.title} closes`)}`),
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${esc(`${o.title} closes tomorrow`)}`),
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

/** A Google Calendar "add event" link, for people who prefer one click. */
export function googleCalendarUrl(o, origin = '') {
  if (!o.deadline) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${o.title} — deadline`,
    dates: `${dateOnly(o.deadline)}/${dateOnly(plusDays(o.deadline, 1))}`,
    details: `${o.summary}\n\nOfficial page: ${o.officialUrl}${origin ? `\nRadar listing: ${origin}/opportunity.html?id=${o.id}` : ''}\n\nConfirm the deadline on the official page.`,
    location: o.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
