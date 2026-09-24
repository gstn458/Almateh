/**
 * Radar server: static site + JSON API, on Node's built-in http module.
 *
 * No framework and no dependencies, so `node server/index.js` is the whole
 * deployment story. Put it behind a TLS-terminating proxy in production —
 * the cookie is issued Secure whenever the request arrives over HTTPS.
 */
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { ROOT, seedCatalogue } from './db.js';
import { userForToken } from './auth.js';
import { routes, HttpError } from './api.js';

const PORT = Number(process.env.PORT || 4173);
const PUBLIC = join(ROOT, 'public');
const COOKIE = 'radar_session';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

/**
 * Content Security Policy.
 *
 * `script-src` allows first-party code and Google's CDN, which is where the
 * Firebase SDK comes from; still no inline scripts and no eval. The Google and
 * Firebase hosts in `connect-src` and `frame-src` are what sign-in and
 * Firestore need. `style-src` permits inline style
 * attributes, which the layout uses; a style attribute cannot execute code,
 * and every value interpolated into markup is escaped before it gets there.
 * Tightening this further means moving the remaining style attributes into
 * stylesheet rules, which is worth doing but is not a security hole today.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://*.googleusercontent.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com",
  "frame-src https://*.firebaseapp.com https://accounts.google.com",
  "form-action 'self' https://accounts.google.com https://*.firebaseapp.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = (secure) => ({
  'content-security-policy': CSP,
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'permissions-policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  ...(secure ? { 'strict-transport-security': 'max-age=31536000; includeSubDomains' } : {}),
});

const parseCookies = (header = '') =>
  Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    return index === -1 ? [part.trim(), ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));

/** Matches a path against the route table, returning params for `:name` parts. */
function matchRoute(method, pathname) {
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue;
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');
    if (patternParts.length !== pathParts.length) continue;
    const params = {};
    let matched = true;
    for (let i = 0; i < patternParts.length; i += 1) {
      const expected = patternParts[i];
      const actual = decodeURIComponent(pathParts[i]);
      if (expected.startsWith(':')) {
        /* `:idOrSlug.ics` — a parameter with a literal suffix. */
        const dot = expected.indexOf('.');
        if (dot > -1) {
          const suffix = expected.slice(dot);
          if (!actual.endsWith(suffix)) { matched = false; break; }
          params[expected.slice(1, dot)] = actual.slice(0, -suffix.length);
        } else {
          params[expected.slice(1)] = actual;
        }
      } else if (expected !== actual) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler, params };
  }
  return null;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new HttpError(413, 'That request is too large.');
    chunks.push(chunk);
  }
  if (!chunks.length) return null;
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body must be JSON.');
  }
}

function sessionCookie(token, expires, secure) {
  const parts = [
    `${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax',
    `Expires=${new Date(expires).toUTCString()}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

async function handleApi(req, res, url, secure) {
  const route = matchRoute(req.method, url.pathname);
  if (!route) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No such endpoint.' }));
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE];
  const request = {
    method: req.method,
    params: route.params,
    query: Object.fromEntries(url.searchParams),
    body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readBody(req) : null,
    user: userForToken(token),
    sessionToken: token,
    origin: `${secure ? 'https' : 'http'}://${req.headers.host}`,
  };

  const result = await route.handler(request);
  const shaped = result && typeof result === 'object' && ('body' in result || 'raw' in result || 'status' in result)
    ? result
    : { body: result };

  const headers = { 'cache-control': 'no-store', ...(shaped.headers || {}) };
  if (shaped.setSession) headers['set-cookie'] = sessionCookie(shaped.setSession.token, shaped.setSession.expires, secure);
  if (shaped.clearSession) headers['set-cookie'] = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

  const payload = shaped.raw ?? JSON.stringify(shaped.body ?? null);
  if (!headers['content-type']) headers['content-type'] = 'application/json; charset=utf-8';
  res.writeHead(shaped.status || 200, headers);
  res.end(payload);
}

async function serveStatic(req, res, url, secure) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (!extname(pathname)) pathname += '.html';

  const filePath = normalize(join(PUBLIC, pathname));
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    const notFound = join(PUBLIC, '404.html');
    const body = existsSync(notFound) ? await readFile(notFound) : Buffer.from('Not found');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', ...securityHeaders(secure) });
    res.end(body);
    return;
  }

  const ext = extname(filePath);
  const stats = statSync(filePath);
  const etag = `W/"${stats.size}-${Number(stats.mtimeMs).toString(36)}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304).end();
    return;
  }

  /**
   * Only images get a long cache. Scripts and styles keep their filenames
   * across deploys, so caching them hard would leave visitors running old code
   * until it expired. They revalidate against the ETag instead, which costs
   * one 304 per file and makes a deploy take effect on the next reload.
   */
  const cacheControl = ext === '.html'
    ? 'no-cache'
    : /^\/assets\/img\//.test(pathname)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate';

  const headers = {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': cacheControl,
    etag,
    ...securityHeaders(secure),
  };

  const wantsGzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (wantsGzip) {
    headers['content-encoding'] = 'gzip';
    headers.vary = 'Accept-Encoding';
    res.writeHead(200, headers);
    await pipeline(createReadStream(filePath), createGzip(), res);
    return;
  }

  headers['content-length'] = stats.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  await pipeline(createReadStream(filePath), res);
}

const server = createServer(async (req, res) => {
  const secure = req.headers['x-forwarded-proto'] === 'https';
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url, secure);
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      await serveStatic(req, res, url, secure);
    } else {
      res.writeHead(405, { allow: 'GET, HEAD' }).end();
    }
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error(error);
    if (res.headersSent) { res.end(); return; }
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      error: status === 500 ? 'Something went wrong on our side.' : error.message,
      field: error.field,
    }));
  }
});

const seeded = seedCatalogue({ force: process.env.RADAR_RESEED === '1' });
server.listen(PORT, () => {
  console.log(`Radar listening on http://localhost:${PORT} — catalogue: ${seeded} listings`);
});
