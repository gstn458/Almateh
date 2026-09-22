/**
 * The offline half of the data layer.
 *
 * Radar's frontend is a static site, which means it can be opened without the
 * API running — on a file:// URL, on static hosting, or on a flaky connection.
 * This module answers the same routes the server does, against the catalogue
 * JSON and localStorage, so every page works either way and nothing has to
 * branch on which mode it is in.
 *
 * Data written here stays in one browser. `api.mode` is 'local' in that case
 * and the UI says so, rather than implying an account exists.
 */
import { rankOpportunities, scoreOpportunity, similarOpportunities, deriveStatus } from './matching.js';

const KEY = 'radar.local.v1';
const CATALOGUE_URL = new URL('../../data/opportunities.json', import.meta.url);

let catalogue = null;

const blank = () => ({
  user: null,
  profile: {},
  saves: [],
  applications: [],
  reminders: [],
  analytics: [],
});

function read() {
  try {
    return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return blank();
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Private browsing or a full quota: the session still works in memory. */
  }
  memory = state;
  return state;
}

let memory = null;
const state = () => (memory ||= read());

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();

export async function loadCatalogue() {
  if (catalogue) return catalogue;
  const response = await fetch(CATALOGUE_URL);
  if (!response.ok) throw new Error('The opportunity catalogue could not be loaded.');
  catalogue = await response.json();
  return catalogue;
}

const decorate = (o, profile) => ({
  ...o,
  liveStatus: deriveStatus(o),
  match: scoreOpportunity(o, profile),
});

class LocalError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const requireUser = () => {
  const s = state();
  if (!s.user) throw new LocalError(401, 'Sign in to continue.');
  return s.user;
};

function filter(results, query) {
  const q = String(query.q || '').trim().toLowerCase();
  return results.filter((o) => {
    if (query.type && query.type !== 'all' && o.type !== query.type) return false;
    if (query.region && query.region !== 'all' && o.region !== query.region) return false;
    if (query.level && query.level !== 'all' && !(o.levels || []).includes(query.level)) return false;
    if (query.funding && query.funding !== 'all' && o.funding !== query.funding) return false;
    if (query.status && query.status !== 'all' && o.liveStatus !== query.status) return false;
    if (!q) return true;
    const haystack = [o.title, o.org, o.field, o.summary, o.location, o.country, (o.tags || []).join(' '), (o.subjects || []).join(' ')]
      .join(' ').toLowerCase();
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });
}

const SORTS = {
  match: (a, b) => (b.match.score ?? -1) - (a.match.score ?? -1),
  deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'),
  newest: (a, b) => String(b.verifiedAt || '').localeCompare(String(a.verifiedAt || '')),
  title: (a, b) => a.title.localeCompare(b.title),
};

const findApp = (s, id) => {
  const application = s.applications.find((a) => a.id === id);
  if (!application) throw new LocalError(404, 'That application is not in your tracker.');
  return application;
};

const hydrate = (s, application, list) => ({
  ...application,
  opportunity: list.find((o) => o.id === application.opportunityId) || null,
  reminders: s.reminders.filter((r) => r.opportunityId === application.opportunityId),
});

/** Answers one request. `path` and `options` mirror the fetch-based client. */
export async function handle(method, path, { body, query } = {}) {
  const list = await loadCatalogue();
  const s = state();
  const profile = s.profile || {};
  const segments = path.replace(/^\/api\//, '').split('/');
  const [head, ...rest] = segments;

  /* -- auth ------------------------------------------------------------- */
  if (head === 'auth') {
    const action = rest[0];
    if (action === 'me') return { user: s.user, profile: s.user ? profile : null };
    if (action === 'signup' || action === 'login') {
      if (!body?.email) throw new LocalError(400, 'Enter a valid email address.');
      if (action === 'signup' && String(body.password || '').length < 10) {
        throw new LocalError(400, 'Use at least 10 characters — length matters more than symbols.');
      }
      if (action === 'signup' && !body.acceptedTerms) {
        throw new LocalError(400, 'Please accept the terms and privacy policy.');
      }
      s.user = {
        id: s.user?.id || uid(),
        email: String(body.email).toLowerCase(),
        name: body.name || s.user?.name || '',
        role: 'student',
        isMinor: Boolean(body.isMinor),
        emailOptIn: Boolean(body.emailOptIn),
        createdAt: s.user?.createdAt || now(),
        local: true,
      };
      write(s);
      return { user: s.user, profile };
    }
    if (action === 'logout') { s.user = null; write(s); return { ok: true }; }
    if (action === 'password') throw new LocalError(501, 'Password changes need the Radar server.');
  }

  /* -- profile ---------------------------------------------------------- */
  if (head === 'profile') {
    if (method === 'GET') return profile;
    requireUser();
    const merged = { ...profile, ...body, updatedAt: now() };
    merged.completedAt = merged.level && merged.country && (merged.subjects || []).length
      ? (profile.completedAt || now())
      : null;
    s.profile = merged;
    write(s);
    return merged;
  }

  /* -- catalogue -------------------------------------------------------- */
  if (head === 'opportunities') {
    if (rest.length === 0) {
      const decorated = list.map((o) => decorate(o, profile));
      const filtered = filter(decorated, query || {});
      const sort = SORTS[query?.sort] || SORTS.match;
      return {
        total: decorated.length,
        count: filtered.length,
        personalised: Boolean(profile.completedAt),
        results: filtered.sort(sort).map((o) => ({ ...o, saved: s.saves.includes(o.id) })),
      };
    }
    const key = rest[0];
    const found = list.find((o) => o.id === key || o.slug === key);
    if (!found) throw new LocalError(404, 'That opportunity is not in the catalogue.');
    return {
      opportunity: decorate(found, profile),
      similar: similarOpportunities(found, list).map((o) => decorate(o, profile)),
      saved: s.saves.includes(found.id),
      application: s.applications.find((a) => a.opportunityId === found.id) || null,
    };
  }

  if (head === 'matches') {
    requireUser();
    if (!profile.completedAt) return { ready: false, results: [] };
    const ranked = rankOpportunities(list, profile)
      .map((o) => ({ ...o, liveStatus: deriveStatus(o) }))
      .filter((o) => o.liveStatus !== 'closed');
    return { ready: true, results: ranked.slice(0, 12) };
  }

  /* -- saves ------------------------------------------------------------ */
  if (head === 'saves') {
    if (method === 'GET') {
      requireUser();
      return s.saves
        .map((id) => list.find((o) => o.id === id))
        .filter(Boolean)
        .map((o) => ({ ...decorate(o, profile), saved: true }));
    }
    requireUser();
    const id = rest[0];
    if (method === 'POST' && !s.saves.includes(id)) s.saves.unshift(id);
    if (method === 'DELETE') s.saves = s.saves.filter((x) => x !== id);
    write(s);
    return { saved: method === 'POST' };
  }

  /* -- applications ------------------------------------------------------ */
  if (head === 'applications') {
    requireUser();
    if (method === 'GET') return s.applications.map((a) => hydrate(s, a, list));

    if (method === 'POST' && rest.length === 0) {
      const opportunity = list.find((o) => o.id === body?.opportunityId);
      if (!opportunity) throw new LocalError(404, 'Unknown opportunity.');
      const existing = s.applications.find((a) => a.opportunityId === opportunity.id);
      if (existing) return hydrate(s, existing, list);
      const application = {
        id: uid(),
        opportunityId: opportunity.id,
        stage: body?.stage || 'saved',
        notes: '',
        contacts: '',
        appliedOn: null,
        resultOn: null,
        outcome: null,
        createdAt: now(),
        updatedAt: now(),
        checklist: (opportunity.documents || []).slice(0, 6).map((label) => ({ id: uid(), label, done: false })),
        history: [{ id: uid(), from: null, to: body?.stage || 'saved', note: 'Added to tracker', at: now() }],
      };
      s.applications.unshift(application);
      if (!s.saves.includes(opportunity.id)) s.saves.unshift(opportunity.id);
      write(s);
      return hydrate(s, application, list);
    }

    const application = findApp(s, rest[0]);

    if (rest[1] === 'checklist') {
      if (method === 'POST') {
        application.checklist.push({ id: uid(), label: String(body?.label || '').slice(0, 200), done: false });
      } else {
        const item = application.checklist.find((c) => c.id === rest[2]);
        if (method === 'PATCH' && item) item.done = Boolean(body?.done);
        if (method === 'DELETE') application.checklist = application.checklist.filter((c) => c.id !== rest[2]);
      }
      application.updatedAt = now();
      write(s);
      return hydrate(s, application, list);
    }

    if (method === 'PATCH') {
      if (body.stage && body.stage !== application.stage) {
        application.history.unshift({ id: uid(), from: application.stage, to: body.stage, note: body.note || '', at: now() });
      }
      Object.assign(application, {
        stage: body.stage ?? application.stage,
        notes: body.notes ?? application.notes,
        contacts: body.contacts ?? application.contacts,
        appliedOn: body.appliedOn !== undefined ? body.appliedOn : application.appliedOn,
        resultOn: body.resultOn !== undefined ? body.resultOn : application.resultOn,
        outcome: body.outcome !== undefined ? body.outcome : application.outcome,
        updatedAt: now(),
      });
      write(s);
      return hydrate(s, application, list);
    }

    if (method === 'DELETE') {
      s.applications = s.applications.filter((a) => a.id !== application.id);
      write(s);
      return { ok: true };
    }
  }

  /* -- reminders --------------------------------------------------------- */
  if (head === 'reminders') {
    requireUser();
    if (rest[0] === 'due') {
      const today = now().slice(0, 10);
      return s.reminders
        .filter((r) => r.remindOn <= today && !r.acknowledged)
        .map((r) => ({ ...r, opportunity: list.find((o) => o.id === r.opportunityId) }));
    }
    if (rest[1] === 'ack') {
      const reminder = s.reminders.find((r) => r.id === rest[0]);
      if (reminder) reminder.acknowledged = true;
      write(s);
      return { ok: true };
    }
    if (method === 'GET') {
      return s.reminders.map((r) => ({ ...r, opportunity: list.find((o) => o.id === r.opportunityId) }));
    }
    if (method === 'POST') {
      const reminder = {
        id: uid(),
        opportunityId: body?.opportunityId,
        remindOn: body?.remindOn,
        channel: body?.channel || 'in-app',
        label: body?.label || '',
      };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(reminder.remindOn))) throw new LocalError(400, 'Pick a reminder date.');
      s.reminders.push(reminder);
      s.reminders.sort((a, b) => a.remindOn.localeCompare(b.remindOn));
      write(s);
      return reminder;
    }
    if (method === 'DELETE') {
      s.reminders = s.reminders.filter((r) => r.id !== rest[0]);
      write(s);
      return { ok: true };
    }
  }

  /* -- account ----------------------------------------------------------- */
  if (head === 'account') {
    if (rest[0] === 'export') {
      requireUser();
      return { exportedAt: now(), account: s.user, profile, saves: s.saves, applications: s.applications, reminders: s.reminders };
    }
    if (method === 'DELETE') {
      write(blank());
      return { deleted: true };
    }
  }

  /* -- write-only endpoints that need a server --------------------------- */
  if (head === 'reports' || head === 'messages') {
    throw new LocalError(503, 'This form needs the Radar server. Your message was not sent.');
  }
  if (head === 'analytics') {
    s.analytics.push({ name: body?.name, at: now() });
    s.analytics = s.analytics.slice(-200);
    write(s);
    return { ok: true, local: true };
  }
  if (head === 'admin') {
    throw new LocalError(503, 'The admin system needs the Radar server.');
  }

  throw new LocalError(404, 'No such endpoint.');
}
