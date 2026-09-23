/**
 * One way to talk to Radar's data.
 *
 * Three backends answer the same routes, so no page ever branches on which is
 * running: the Node API when it is there, Firebase when the site is deployed
 * statically with a project configured, and the browser's own storage when
 * neither is. `api.mode` says which one served the last call, and the UI uses
 * it to be honest about where a save actually went.
 */
import * as local from './local-backend.js';
import { firebaseReady } from './firebase-config.js';

export const api = {
  mode: 'unknown',        // 'server' | 'firebase' | 'local'
  onModeChange: null,
};

let probe = null;

/**
 * One probe per page load, cached. The Node API wins when it answers, because
 * it is the fuller product — it carries the admin console with it.
 */
function detect() {
  probe ||= fetch('/api/auth/me', { credentials: 'same-origin', headers: { accept: 'application/json' } })
    .then((response) => {
      if (!response.ok && response.status >= 500) throw new Error('server error');
      if (!(response.headers.get('content-type') || '').includes('json')) throw new Error('not the api');
      setMode('server');
      return 'server';
    })
    .catch(() => {
      const mode = firebaseReady() ? 'firebase' : 'local';
      setMode(mode);
      return mode;
    });
  return probe;
}

/** Loaded only when a Firebase project is actually configured. */
let firebaseModule = null;
const loadFirebase = () => (firebaseModule ||= import('./firebase-backend.js'));

function setMode(mode) {
  if (api.mode === mode) return;
  api.mode = mode;
  api.onModeChange?.(mode);
}

export class ApiError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

function toQuery(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const string = params.toString();
  return string ? `?${string}` : '';
}

async function request(method, path, { body, query, raw } = {}) {
  const mode = await detect();

  if (mode === 'firebase') {
    try {
      return await (await loadFirebase()).handle(method, path, { body, query });
    } catch (error) {
      throw new ApiError(error.status || 500, error.message, error.field);
    }
  }

  if (mode === 'server') {
    try {
      const response = await fetch(path + toQuery(query), {
        method,
        credentials: 'same-origin',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (raw) {
        if (!response.ok) throw new ApiError(response.status, 'That download is not available.');
        return response;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(response.status, payload?.error || 'Something went wrong.', payload?.field);
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      /* The network dropped mid-session: fall through to the local backend so
         the student keeps working rather than hitting a dead page. */
      setMode('local');
    }
  }

  try {
    return await local.handle(method, path, { body, query });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message);
  }
}

export const get = (path, query) => request('GET', path, { query });
export const post = (path, body) => request('POST', path, { body });
export const put = (path, body) => request('PUT', path, { body });
export const patch = (path, body) => request('PATCH', path, { body });
export const del = (path, body) => request('DELETE', path, { body });
export const getRaw = (path) => request('GET', path, { raw: true });

/** Counts one product event. Never blocks the interaction it describes. */
export function track(name, bucket = '', surface = '') {
  try {
    if (localStorage.getItem('radar.analytics.off') === '1') return;
  } catch { /* storage blocked: fall through and count it */ }
  post('/api/analytics', { name, bucket, surface }).catch(() => {});
}

export const loadCatalogue = local.loadCatalogue;
