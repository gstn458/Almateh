/**
 * The Radar HTTP API.
 *
 * Routes are declared as [method, pattern, handler]; `:name` segments become
 * `req.params`. Handlers return a plain value (sent as JSON), or a
 * `{ status, headers, body }` object when they need control of the response.
 */
import {
  db, all, get, run, id, now, audit,
  listOpportunities, getOpportunity, rowToOpportunity,
} from './db.js';
import {
  createUser, findUserByEmail, verifyPassword, createSession, destroySession,
  deleteAccount, publicUser, validateEmail, validatePassword, setPassword,
} from './auth.js';
import { buildIcs } from './ics.js';
import { rankOpportunities, scoreOpportunity, similarOpportunities, deriveStatus } from '../public/assets/js/matching.js';

class HttpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}
const fail = (status, message, field) => { throw new HttpError(status, message, field); };
export { HttpError };

const STAGES = [
  'saved', 'researching', 'preparing', 'drafting', 'ready', 'submitted',
  'interview', 'accepted', 'waitlisted', 'rejected', 'not-eligible',
];

const requireUser = (req) => req.user || fail(401, 'Sign in to continue.');
const requireAdmin = (req) => {
  const user = requireUser(req);
  if (user.role !== 'admin') fail(403, 'Administrator access required.');
  return user;
};

/* ---------------------------------------------------------------- profiles */

const parseProfile = (row) => row && ({
  level: row.level,
  yearOrGrade: row.year_or_grade,
  country: row.country,
  city: row.city,
  citizenship: row.citizenship,
  subjects: JSON.parse(row.subjects_json),
  goals: JSON.parse(row.goals_json),
  types: JSON.parse(row.types_json),
  regions: JSON.parse(row.regions_json),
  fundingNeed: row.funding_need,
  experience: row.experience,
  availability: row.availability,
  willingToTravel: Boolean(row.willing_to_travel),
  notes: row.notes,
  completedAt: row.completed_at,
  updatedAt: row.updated_at,
});

const loadProfile = (userId) => parseProfile(get('SELECT * FROM profiles WHERE user_id = ?', userId)) || {};

const asArray = (value) => (Array.isArray(value) ? value.map(String).slice(0, 40) : []);

function saveProfile(userId, body) {
  const existing = loadProfile(userId);
  const merged = { ...existing, ...body };
  const required = merged.level && merged.country && asArray(merged.subjects).length;
  run(
    `UPDATE profiles SET level=?, year_or_grade=?, country=?, city=?, citizenship=?,
       subjects_json=?, goals_json=?, types_json=?, regions_json=?, funding_need=?,
       experience=?, availability=?, willing_to_travel=?, notes=?, completed_at=?, updated_at=?
     WHERE user_id=?`,
    merged.level ?? null, merged.yearOrGrade ?? null, merged.country ?? null, merged.city ?? null,
    merged.citizenship ?? null, JSON.stringify(asArray(merged.subjects)), JSON.stringify(asArray(merged.goals)),
    JSON.stringify(asArray(merged.types)), JSON.stringify(asArray(merged.regions)), merged.fundingNeed ?? null,
    merged.experience ?? null, merged.availability ?? null, merged.willingToTravel === false ? 0 : 1,
    String(merged.notes ?? '').slice(0, 2000),
    required ? (existing.completedAt || now()) : null, now(), userId,
  );
  return loadProfile(userId);
}

/* ------------------------------------------------------------ applications */

const appRow = (row) => ({
  id: row.id,
  opportunityId: row.opportunity_id,
  stage: row.stage,
  notes: row.notes,
  contacts: row.contacts,
  appliedOn: row.applied_on,
  resultOn: row.result_on,
  outcome: row.outcome,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const loadApplication = (userId, applicationId) => {
  const row = get('SELECT * FROM applications WHERE id = ? AND user_id = ?', applicationId, userId);
  if (!row) fail(404, 'That application is not in your tracker.');
  return row;
};

const withDetail = (userId, row) => ({
  ...appRow(row),
  opportunity: getOpportunity(row.opportunity_id),
  checklist: all('SELECT * FROM checklist_items WHERE application_id = ? ORDER BY created_at', row.id)
    .map((c) => ({ id: c.id, label: c.label, done: Boolean(c.done) })),
  history: all('SELECT * FROM application_events WHERE application_id = ? ORDER BY created_at DESC', row.id)
    .map((e) => ({ id: e.id, from: e.from_stage, to: e.to_stage, note: e.note, at: e.created_at })),
  reminders: all('SELECT * FROM reminders WHERE user_id = ? AND opportunity_id = ? ORDER BY remind_on', userId, row.opportunity_id)
    .map((r) => ({ id: r.id, remindOn: r.remind_on, channel: r.channel, label: r.label })),
});

/* ----------------------------------------------------------------- catalogue */

/** Applies the catalogue's live status and drops nothing silently. */
const decorate = (o, profile, at = new Date()) => ({
  ...o,
  liveStatus: o.isExpired ? 'closed' : deriveStatus(o, at),
  match: scoreOpportunity(o, profile, at),
});

function filterCatalogue(catalogue, query) {
  const q = String(query.q || '').trim().toLowerCase();
  const type = query.type && query.type !== 'all' ? query.type : null;
  const region = query.region && query.region !== 'all' ? query.region : null;
  const level = query.level && query.level !== 'all' ? query.level : null;
  const funding = query.funding && query.funding !== 'all' ? query.funding : null;
  const status = query.status && query.status !== 'all' ? query.status : null;

  return catalogue.filter((o) => {
    if (type && o.type !== type) return false;
    if (region && o.region !== region) return false;
    if (level && !(o.levels || []).includes(level)) return false;
    if (funding && o.funding !== funding) return false;
    if (status && o.liveStatus !== status) return false;
    if (!q) return true;
    const haystack = [o.title, o.org, o.field, o.summary, o.location, o.country, (o.tags || []).join(' '), (o.subjects || []).join(' ')]
      .join(' ').toLowerCase();
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });
}

const SORTS = {
  match: (a, b) => (b.match.score ?? -1) - (a.match.score ?? -1),
  deadline: (a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  },
  newest: (a, b) => String(b.verifiedAt || '').localeCompare(String(a.verifiedAt || '')),
  title: (a, b) => a.title.localeCompare(b.title),
};

/* --------------------------------------------------------------- the routes */

export const routes = [
  /* -- auth ------------------------------------------------------------- */
  ['POST', '/api/auth/signup', (req) => {
    const { email, password, name, isMinor, emailOptIn, acceptedTerms } = req.body || {};
    if (!validateEmail(email)) fail(400, 'Enter a valid email address.', 'email');
    const problem = validatePassword(password);
    if (problem) fail(400, problem, 'password');
    if (!acceptedTerms) fail(400, 'Please accept the terms and privacy policy.', 'acceptedTerms');
    if (findUserByEmail(email)) fail(409, 'An account already exists for that email.', 'email');
    const user = createUser({ email, password, name, isMinor, emailOptIn });
    const session = createSession(user.id);
    return { status: 201, setSession: session, body: { user: publicUser(user), profile: loadProfile(user.id) } };
  }],

  ['POST', '/api/auth/login', (req) => {
    const { email, password } = req.body || {};
    const user = findUserByEmail(email);
    if (!user || !verifyPassword(user, password || '')) fail(401, 'That email and password do not match.');
    const session = createSession(user.id);
    return { setSession: session, body: { user: publicUser(user), profile: loadProfile(user.id) } };
  }],

  ['POST', '/api/auth/logout', (req) => {
    if (req.sessionToken) destroySession(req.sessionToken);
    return { clearSession: true, body: { ok: true } };
  }],

  ['GET', '/api/auth/me', (req) => (req.user
    ? { user: publicUser(req.user), profile: loadProfile(req.user.id) }
    : { user: null, profile: null })],

  ['POST', '/api/auth/password', (req) => {
    const user = requireUser(req);
    const { current, next } = req.body || {};
    if (!verifyPassword(get('SELECT * FROM users WHERE id = ?', user.id), current || '')) {
      fail(401, 'Your current password is not correct.', 'current');
    }
    const problem = validatePassword(next);
    if (problem) fail(400, problem, 'next');
    setPassword(user.id, next);
    /* Every other device is signed out: a password change should end old sessions. */
    run('DELETE FROM sessions WHERE user_id = ? AND token <> ?', user.id, req.sessionToken || '');
    return { ok: true };
  }],

  /* -- profile ---------------------------------------------------------- */
  ['GET', '/api/profile', (req) => loadProfile(requireUser(req).id)],
  ['PUT', '/api/profile', (req) => saveProfile(requireUser(req).id, req.body || {})],

  /* -- catalogue -------------------------------------------------------- */
  ['GET', '/api/opportunities', (req) => {
    const profile = req.user ? loadProfile(req.user.id) : {};
    const at = new Date();
    const decorated = listOpportunities().map((o) => decorate(o, profile, at));
    const filtered = filterCatalogue(decorated, req.query);
    const sort = SORTS[req.query.sort] || SORTS.match;
    const saved = req.user
      ? new Set(all('SELECT opportunity_id FROM saves WHERE user_id = ?', req.user.id).map((r) => r.opportunity_id))
      : new Set();
    return {
      total: decorated.length,
      count: filtered.length,
      personalised: Boolean(profile.completedAt),
      results: filtered.sort(sort).map((o) => ({ ...o, saved: saved.has(o.id) })),
    };
  }],

  ['GET', '/api/opportunities/:idOrSlug', (req) => {
    const o = getOpportunity(req.params.idOrSlug);
    if (!o) fail(404, 'That opportunity is not in the catalogue.');
    const profile = req.user ? loadProfile(req.user.id) : {};
    const catalogue = listOpportunities();
    return {
      opportunity: decorate(o, profile),
      similar: similarOpportunities(o, catalogue).map((s) => decorate(s, profile)),
      saved: req.user
        ? Boolean(get('SELECT 1 AS x FROM saves WHERE user_id = ? AND opportunity_id = ?', req.user.id, o.id))
        : false,
      application: req.user
        ? (get('SELECT * FROM applications WHERE user_id = ? AND opportunity_id = ?', req.user.id, o.id) || null)
        : null,
    };
  }],

  ['GET', '/api/matches', (req) => {
    const user = requireUser(req);
    const profile = loadProfile(user.id);
    if (!profile.completedAt) return { ready: false, results: [] };
    const ranked = rankOpportunities(listOpportunities(), profile)
      .map((o) => ({ ...o, liveStatus: o.isExpired ? 'closed' : deriveStatus(o) }))
      .filter((o) => o.liveStatus !== 'closed');
    return { ready: true, results: ranked.slice(0, 12) };
  }],

  /* -- saves ------------------------------------------------------------ */
  ['GET', '/api/saves', (req) => {
    const user = requireUser(req);
    const profile = loadProfile(user.id);
    return all('SELECT * FROM saves WHERE user_id = ? ORDER BY created_at DESC', user.id)
      .map((row) => {
        const o = getOpportunity(row.opportunity_id);
        return o ? { ...decorate(o, profile), savedAt: row.created_at, saved: true } : null;
      })
      .filter(Boolean);
  }],

  ['POST', '/api/saves/:opportunityId', (req) => {
    const user = requireUser(req);
    if (!getOpportunity(req.params.opportunityId)) fail(404, 'Unknown opportunity.');
    run('INSERT OR IGNORE INTO saves (user_id, opportunity_id, created_at) VALUES (?,?,?)',
      user.id, req.params.opportunityId, now());
    return { saved: true };
  }],

  ['DELETE', '/api/saves/:opportunityId', (req) => {
    const user = requireUser(req);
    run('DELETE FROM saves WHERE user_id = ? AND opportunity_id = ?', user.id, req.params.opportunityId);
    return { saved: false };
  }],

  /* -- applications ------------------------------------------------------ */
  ['GET', '/api/applications', (req) => {
    const user = requireUser(req);
    return all('SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC', user.id)
      .map((row) => withDetail(user.id, row));
  }],

  ['POST', '/api/applications', (req) => {
    const user = requireUser(req);
    const opportunityId = req.body?.opportunityId;
    const opportunity = getOpportunity(opportunityId);
    if (!opportunity) fail(404, 'Unknown opportunity.');
    const existing = get('SELECT * FROM applications WHERE user_id = ? AND opportunity_id = ?', user.id, opportunityId);
    if (existing) return withDetail(user.id, existing);
    const stage = STAGES.includes(req.body?.stage) ? req.body.stage : 'saved';
    const applicationId = id();
    run(`INSERT INTO applications (id, user_id, opportunity_id, stage, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
      applicationId, user.id, opportunityId, stage, now(), now());
    run('INSERT INTO application_events (id, application_id, from_stage, to_stage, note, created_at) VALUES (?,?,?,?,?,?)',
      id(), applicationId, null, stage, 'Added to tracker', now());
    run('INSERT OR IGNORE INTO saves (user_id, opportunity_id, created_at) VALUES (?,?,?)', user.id, opportunityId, now());
    /* A default checklist beats an empty panel: it shows what the work is. */
    for (const label of (opportunity.documents || []).slice(0, 6)) {
      run('INSERT INTO checklist_items (id, application_id, label, done, created_at) VALUES (?,?,?,0,?)',
        id(), applicationId, label, now());
    }
    return { status: 201, body: withDetail(user.id, loadApplication(user.id, applicationId)) };
  }],

  ['PATCH', '/api/applications/:id', (req) => {
    const user = requireUser(req);
    const row = loadApplication(user.id, req.params.id);
    const body = req.body || {};
    if (body.stage && !STAGES.includes(body.stage)) fail(400, 'Unknown stage.');
    const stage = body.stage || row.stage;
    if (body.stage && body.stage !== row.stage) {
      run('INSERT INTO application_events (id, application_id, from_stage, to_stage, note, created_at) VALUES (?,?,?,?,?,?)',
        id(), row.id, row.stage, body.stage, String(body.note || '').slice(0, 500), now());
    }
    run(`UPDATE applications SET stage=?, notes=?, contacts=?, applied_on=?, result_on=?, outcome=?, updated_at=? WHERE id=?`,
      stage,
      body.notes !== undefined ? String(body.notes).slice(0, 8000) : row.notes,
      body.contacts !== undefined ? String(body.contacts).slice(0, 2000) : row.contacts,
      body.appliedOn !== undefined ? body.appliedOn : row.applied_on,
      body.resultOn !== undefined ? body.resultOn : row.result_on,
      body.outcome !== undefined ? body.outcome : row.outcome,
      now(), row.id);
    return withDetail(user.id, loadApplication(user.id, row.id));
  }],

  ['DELETE', '/api/applications/:id', (req) => {
    const user = requireUser(req);
    loadApplication(user.id, req.params.id);
    run('DELETE FROM applications WHERE id = ? AND user_id = ?', req.params.id, user.id);
    return { ok: true };
  }],

  ['POST', '/api/applications/:id/checklist', (req) => {
    const user = requireUser(req);
    const row = loadApplication(user.id, req.params.id);
    const label = String(req.body?.label || '').trim();
    if (!label) fail(400, 'Give the task a name.', 'label');
    run('INSERT INTO checklist_items (id, application_id, label, done, created_at) VALUES (?,?,?,0,?)',
      id(), row.id, label.slice(0, 200), now());
    return withDetail(user.id, row);
  }],

  ['PATCH', '/api/applications/:id/checklist/:itemId', (req) => {
    const user = requireUser(req);
    const row = loadApplication(user.id, req.params.id);
    run('UPDATE checklist_items SET done = ? WHERE id = ? AND application_id = ?',
      req.body?.done ? 1 : 0, req.params.itemId, row.id);
    return withDetail(user.id, row);
  }],

  ['DELETE', '/api/applications/:id/checklist/:itemId', (req) => {
    const user = requireUser(req);
    const row = loadApplication(user.id, req.params.id);
    run('DELETE FROM checklist_items WHERE id = ? AND application_id = ?', req.params.itemId, row.id);
    return withDetail(user.id, row);
  }],

  /* -- reminders and calendar ------------------------------------------- */
  ['GET', '/api/reminders', (req) => {
    const user = requireUser(req);
    return all('SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_on', user.id)
      .map((r) => ({
        id: r.id,
        opportunityId: r.opportunity_id,
        opportunity: getOpportunity(r.opportunity_id),
        remindOn: r.remind_on,
        channel: r.channel,
        label: r.label,
        sentAt: r.sent_at,
      }));
  }],

  ['POST', '/api/reminders', (req) => {
    const user = requireUser(req);
    const { opportunityId, remindOn, channel = 'in-app', label = '' } = req.body || {};
    if (!getOpportunity(opportunityId)) fail(404, 'Unknown opportunity.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(remindOn || ''))) fail(400, 'Pick a reminder date.', 'remindOn');
    const reminderId = id();
    run('INSERT INTO reminders (id, user_id, opportunity_id, remind_on, channel, label, created_at) VALUES (?,?,?,?,?,?,?)',
      reminderId, user.id, opportunityId, remindOn, channel, String(label).slice(0, 200), now());
    return { status: 201, body: { id: reminderId } };
  }],

  ['DELETE', '/api/reminders/:id', (req) => {
    const user = requireUser(req);
    run('DELETE FROM reminders WHERE id = ? AND user_id = ?', req.params.id, user.id);
    return { ok: true };
  }],

  /** Reminders that are due now — the in-app notification feed. */
  ['GET', '/api/reminders/due', (req) => {
    const user = requireUser(req);
    const today = new Date().toISOString().slice(0, 10);
    return all('SELECT * FROM reminders WHERE user_id = ? AND remind_on <= ? AND sent_at IS NULL ORDER BY remind_on', user.id, today)
      .map((r) => ({ id: r.id, remindOn: r.remind_on, label: r.label, opportunity: getOpportunity(r.opportunity_id) }));
  }],

  ['POST', '/api/reminders/:id/ack', (req) => {
    const user = requireUser(req);
    run('UPDATE reminders SET sent_at = ? WHERE id = ? AND user_id = ?', now(), req.params.id, user.id);
    return { ok: true };
  }],

  ['GET', '/api/calendar/me.ics', (req) => {
    const user = requireUser(req);
    const ids = all('SELECT opportunity_id FROM saves WHERE user_id = ?', user.id).map((r) => r.opportunity_id);
    const opportunities = ids.map(getOpportunity).filter((o) => o && o.deadline);
    return {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': 'attachment; filename="radar-deadlines.ics"',
      },
      raw: buildIcs(opportunities, { name: 'Radar — my deadlines', origin: req.origin }),
    };
  }],

  ['GET', '/api/calendar/:idOrSlug.ics', (req) => {
    const o = getOpportunity(req.params.idOrSlug);
    if (!o) fail(404, 'Unknown opportunity.');
    if (!o.deadline) fail(409, 'This listing has no fixed date to export.');
    return {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="${o.slug}.ics"`,
      },
      raw: buildIcs([o], { name: o.title, origin: req.origin }),
    };
  }],

  /* -- reports, contact, waitlist ---------------------------------------- */
  ['POST', '/api/reports', (req) => {
    const { opportunityId, reason, detail, contactEmail } = req.body || {};
    if (!reason) fail(400, 'Tell us what is wrong with the listing.', 'reason');
    if (contactEmail && !validateEmail(contactEmail)) fail(400, 'That email address does not look right.', 'contactEmail');
    run(`INSERT INTO reports (id, opportunity_id, user_id, reason, detail, contact_email, created_at) VALUES (?,?,?,?,?,?,?)`,
      id(), opportunityId ?? null, req.user?.id ?? null, String(reason).slice(0, 120),
      String(detail || '').slice(0, 4000), contactEmail ?? null, now());
    return { status: 201, body: { received: true } };
  }],

  ['POST', '/api/messages', (req) => {
    const { kind = 'contact', name = '', email, subject = '', body = '' } = req.body || {};
    if (!validateEmail(email)) fail(400, 'Enter a valid email address.', 'email');
    if (kind === 'contact' && !String(body).trim()) fail(400, 'Add a message.', 'body');
    run('INSERT INTO messages (id, kind, name, email, subject, body, created_at) VALUES (?,?,?,?,?,?,?)',
      id(), kind === 'waitlist' ? 'waitlist' : 'contact', String(name).slice(0, 120), email,
      String(subject).slice(0, 200), String(body).slice(0, 5000), now());
    return { status: 201, body: { received: true } };
  }],

  /* -- privacy: export and delete ---------------------------------------- */
  ['GET', '/api/account/export', (req) => {
    const user = requireUser(req);
    return {
      headers: { 'content-disposition': 'attachment; filename="radar-my-data.json"' },
      body: {
        exportedAt: now(),
        account: publicUser(user),
        profile: loadProfile(user.id),
        saves: all('SELECT opportunity_id, created_at FROM saves WHERE user_id = ?', user.id),
        applications: all('SELECT * FROM applications WHERE user_id = ?', user.id).map(appRow),
        reminders: all('SELECT * FROM reminders WHERE user_id = ?', user.id),
      },
    };
  }],

  ['DELETE', '/api/account', (req) => {
    const user = requireUser(req);
    deleteAccount(user.id);
    return { clearSession: true, body: { deleted: true } };
  }],

  /* -- analytics: counts only, no trail ---------------------------------- */
  ['POST', '/api/analytics', (req) => {
    const allowed = new Set([
      'search', 'filter', 'save', 'detail-view', 'external-click', 'profile-complete',
      'reminder-set', 'calendar-export', 'application-start', 'application-submit',
      'application-outcome', 'report-submit',
    ]);
    const name = String(req.body?.name || '');
    if (!allowed.has(name)) return { ok: false };
    run('INSERT INTO analytics_events (id, name, bucket, surface, created_at) VALUES (?,?,?,?,?)',
      id(), name, String(req.body?.bucket || '').slice(0, 60), String(req.body?.surface || '').slice(0, 40), now());
    return { ok: true };
  }],

  /* -- admin ------------------------------------------------------------- */
  ['GET', '/api/admin/overview', (req) => {
    requireAdmin(req);
    const count = (sql, ...p) => get(sql, ...p).n;
    return {
      opportunities: count('SELECT COUNT(*) AS n FROM opportunities'),
      needsReview: count("SELECT COUNT(*) AS n FROM opportunities WHERE verification_status <> 'verified'"),
      expired: count('SELECT COUNT(*) AS n FROM opportunities WHERE is_expired = 1'),
      brokenLinks: count("SELECT COUNT(*) AS n FROM opportunities WHERE link_status IS NOT NULL AND link_status <> 'ok'"),
      users: count('SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL'),
      openReports: count("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"),
      newMessages: count("SELECT COUNT(*) AS n FROM messages WHERE status = 'new'"),
      applications: count('SELECT COUNT(*) AS n FROM applications'),
      analytics: all('SELECT name, COUNT(*) AS n FROM analytics_events GROUP BY name ORDER BY n DESC'),
      staleVerification: all(
        `SELECT id, slug, verified_at, data_json FROM opportunities
          WHERE verified_at IS NULL OR verified_at < date('now','-90 day') ORDER BY verified_at IS NOT NULL, verified_at LIMIT 25`,
      ).map((r) => ({ id: r.id, slug: r.slug, verifiedAt: r.verified_at, title: JSON.parse(r.data_json).title })),
    };
  }],

  ['GET', '/api/admin/opportunities', (req) => {
    requireAdmin(req);
    return all('SELECT * FROM opportunities ORDER BY updated_at DESC').map((row) => ({
      ...rowToOpportunity(row),
      verifiedBy: row.verified_by,
      updatedAt: row.updated_at,
    }));
  }],

  ['POST', '/api/admin/opportunities', (req) => {
    const admin = requireAdmin(req);
    const data = req.body || {};
    if (!data.title || !data.org || !data.officialUrl) fail(400, 'Title, organisation and official URL are required.');
    const slug = String(data.slug || data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const record = { ...data, id: data.id || slug, slug };
    if (get('SELECT 1 AS x FROM opportunities WHERE id = ? OR slug = ?', record.id, slug)) {
      fail(409, 'A listing with that id or slug already exists.');
    }
    run(`INSERT INTO opportunities (id, slug, data_json, deadline, type, region, verification_status,
          verified_at, verified_by, is_expired, is_featured, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?)`,
      record.id, slug, JSON.stringify(record), record.deadline || null, record.type || 'competition',
      record.region || null, record.verificationStatus || 'needs-review', record.verifiedAt || null,
      admin.email, record.isFeatured ? 1 : 0, now(), now());
    audit(admin, 'opportunity.create', record.id, record.title);
    return { status: 201, body: getOpportunity(record.id) };
  }],

  ['PUT', '/api/admin/opportunities/:id', (req) => {
    const admin = requireAdmin(req);
    const row = get('SELECT * FROM opportunities WHERE id = ?', req.params.id);
    if (!row) fail(404, 'Unknown listing.');
    const merged = { ...JSON.parse(row.data_json), ...req.body, id: row.id, slug: row.slug };
    run(`UPDATE opportunities SET data_json=?, deadline=?, type=?, region=?, verification_status=?,
          verified_at=?, verified_by=?, is_expired=?, is_featured=?, updated_at=? WHERE id=?`,
      JSON.stringify(merged), merged.deadline || null, merged.type, merged.region || null,
      merged.verificationStatus || row.verification_status,
      merged.verifiedAt ?? row.verified_at, admin.email,
      merged.isExpired ? 1 : 0, merged.isFeatured ? 1 : 0, now(), row.id);
    audit(admin, 'opportunity.update', row.id, merged.title);
    return getOpportunity(row.id);
  }],

  ['POST', '/api/admin/opportunities/:id/verify', (req) => {
    const admin = requireAdmin(req);
    const row = get('SELECT * FROM opportunities WHERE id = ?', req.params.id);
    if (!row) fail(404, 'Unknown listing.');
    const today = now().slice(0, 10);
    const data = { ...JSON.parse(row.data_json), verificationStatus: 'verified', verifiedAt: today };
    run(`UPDATE opportunities SET data_json=?, verification_status='verified', verified_at=?, verified_by=?, updated_at=? WHERE id=?`,
      JSON.stringify(data), today, admin.email, now(), row.id);
    audit(admin, 'opportunity.verify', row.id, `verified on ${today}`);
    return getOpportunity(row.id);
  }],

  ['DELETE', '/api/admin/opportunities/:id', (req) => {
    const admin = requireAdmin(req);
    run('DELETE FROM opportunities WHERE id = ?', req.params.id);
    audit(admin, 'opportunity.delete', req.params.id);
    return { ok: true };
  }],

  /** Fetches every official URL and records what came back. */
  ['POST', '/api/admin/link-check', async (req) => {
    const admin = requireAdmin(req);
    const rows = all('SELECT id, data_json FROM opportunities');
    const results = [];
    await Promise.all(rows.map(async (row) => {
      const o = JSON.parse(row.data_json);
      const url = o.applyUrl || o.officialUrl;
      let status = 'unreachable';
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
        clearTimeout(timer);
        status = response.ok ? 'ok' : `http-${response.status}`;
      } catch {
        status = 'unreachable';
      }
      run('UPDATE opportunities SET link_status = ?, link_checked_at = ? WHERE id = ?', status, now(), row.id);
      results.push({ id: row.id, title: o.title, url, status });
    }));
    audit(admin, 'link-check.run', 'catalogue', `${results.filter((r) => r.status !== 'ok').length} problems`);
    return { checkedAt: now(), results: results.sort((a, b) => a.status.localeCompare(b.status)) };
  }],

  /** Marks every listing whose deadline has passed, so nothing reads as open. */
  ['POST', '/api/admin/expire-pass', (req) => {
    const admin = requireAdmin(req);
    const today = new Date().toISOString().slice(0, 10);
    const changed = all("SELECT id FROM opportunities WHERE deadline IS NOT NULL AND deadline < ? AND is_expired = 0", today);
    for (const row of changed) run('UPDATE opportunities SET is_expired = 1, updated_at = ? WHERE id = ?', now(), row.id);
    audit(admin, 'catalogue.expire-pass', 'catalogue', `${changed.length} listings expired`);
    return { expired: changed.length };
  }],

  ['GET', '/api/admin/reports', (req) => {
    requireAdmin(req);
    return all('SELECT * FROM reports ORDER BY created_at DESC LIMIT 200').map((r) => ({
      ...r, opportunity: r.opportunity_id ? getOpportunity(r.opportunity_id) : null,
    }));
  }],

  ['PATCH', '/api/admin/reports/:id', (req) => {
    const admin = requireAdmin(req);
    const status = String(req.body?.status || 'reviewing');
    run('UPDATE reports SET status = ?, resolution = ?, resolved_at = ? WHERE id = ?',
      status, String(req.body?.resolution || '').slice(0, 1000),
      status === 'resolved' || status === 'rejected' ? now() : null, req.params.id);
    audit(admin, 'report.update', req.params.id, status);
    return { ok: true };
  }],

  ['GET', '/api/admin/messages', (req) => {
    requireAdmin(req);
    return all('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200');
  }],

  ['GET', '/api/admin/users', (req) => {
    requireAdmin(req);
    return all(`SELECT u.id, u.email, u.name, u.role, u.is_minor, u.created_at, u.last_seen_at, u.deleted_at,
                  (SELECT COUNT(*) FROM saves s WHERE s.user_id = u.id) AS saves,
                  (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS applications,
                  (SELECT completed_at FROM profiles p WHERE p.user_id = u.id) AS profile_completed_at
                FROM users u ORDER BY u.created_at DESC LIMIT 200`);
  }],

  ['GET', '/api/admin/audit', (req) => {
    requireAdmin(req);
    return all('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200');
  }],
];
