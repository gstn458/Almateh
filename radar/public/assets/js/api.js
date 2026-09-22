/**
 * One way to talk to Radar's data.
 *
 * Calls go to the API when it answers, and to the in-browser backend when it
 * does not, so pages never branch on which is running. `api.mode` says which
 * one served the last call; the UI uses it to be honest about where a save
 * actually went.
 */
import * as local from './local-backend.js';

export const api = {
  mode: 'unknown',        // 'server' | 'local'
  onModeChange: null,
};

let probe = null;

/** One probe per page load, cached: is the API there? */
function detect() {
  probe ||= fetch('/api/auth/me', { credentials: 'same-origin', headers: { accept: 'application/json' } })
    .then((response) => {
      if (!response.ok && response.status >= 500) throw new Error('server error');
      if (!(response.headers.get('content-type') || '').includes('json')) throw new Error('not the api');
      setMode('server');
      return true;
    })
    .catch(() => {
      setMode('local');
      return false;
    });
  return probe;
}

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
  const online = await detect();

  if (online) {
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
