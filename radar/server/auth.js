/**
 * Accounts and sessions.
 *
 * Passwords are stored as scrypt hashes with a per-user salt, compared in
 * constant time. Sessions are opaque random tokens held in an HttpOnly cookie,
 * so page JavaScript can never read or leak one.
 */
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { db, get, run, id, now } from './db.js';

const SESSION_DAYS = 30;
const KEYLEN = 64;

const hash = (password, salt) => scryptSync(password, salt, KEYLEN).toString('hex');

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 10) {
    return 'Use at least 10 characters — length matters more than symbols.';
  }
  if (/^\d+$/.test(password)) return 'Use more than digits alone.';
  return null;
}

export function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function createUser({ email, password, name = '', isMinor = false, emailOptIn = false, role = 'student' }) {
  const salt = randomBytes(16).toString('hex');
  const userId = id();
  run(
    `INSERT INTO users (id, email, name, password_hash, password_salt, role, is_minor, email_opt_in, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    userId, email.trim().toLowerCase(), name.trim(), hash(password, salt), salt, role,
    isMinor ? 1 : 0, emailOptIn ? 1 : 0, now(),
  );
  run('INSERT INTO profiles (user_id, updated_at) VALUES (?, ?)', userId, now());
  return findUserById(userId);
}

export const findUserByEmail = (email) =>
  get('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', String(email || '').trim().toLowerCase());

export const findUserById = (userId) =>
  get('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', userId);

export function verifyPassword(user, password) {
  if (!user) return false;
  const candidate = Buffer.from(hash(password, user.password_salt), 'hex');
  const stored = Buffer.from(user.password_hash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

/** Replaces a user's password with a freshly salted hash. */
export function setPassword(userId, password) {
  const salt = randomBytes(16).toString('hex');
  run('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', hash(password, salt), salt, userId);
}

export function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  run('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)', token, userId, now(), expires);
  return { token, expires };
}

export function userForToken(token) {
  if (!token) return null;
  const session = get('SELECT * FROM sessions WHERE token = ?', token);
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    run('DELETE FROM sessions WHERE token = ?', token);
    return null;
  }
  const user = findUserById(session.user_id);
  if (user) run('UPDATE users SET last_seen_at = ? WHERE id = ?', now(), user.id);
  return user;
}

export const destroySession = (token) => run('DELETE FROM sessions WHERE token = ?', token);

/**
 * Account deletion. Rows that belong to the student are removed outright;
 * the user row is kept only as an anonymised tombstone so a re-signup with the
 * same address cannot silently inherit an old account's data.
 */
export function deleteAccount(userId) {
  const tombstone = `deleted-${createHash('sha256').update(userId).digest('hex').slice(0, 16)}@deleted.invalid`;
  db.exec('BEGIN');
  try {
    run('DELETE FROM sessions WHERE user_id = ?', userId);
    run('DELETE FROM profiles WHERE user_id = ?', userId);
    run('DELETE FROM saves WHERE user_id = ?', userId);
    run('DELETE FROM reminders WHERE user_id = ?', userId);
    run('DELETE FROM applications WHERE user_id = ?', userId);
    run('UPDATE reports SET user_id = NULL WHERE user_id = ?', userId);
    run(
      `UPDATE users SET email = ?, name = '', password_hash = '', password_salt = '', deleted_at = ? WHERE id = ?`,
      tombstone, now(), userId,
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export const publicUser = (user) => user && ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isMinor: Boolean(user.is_minor),
  emailOptIn: Boolean(user.email_opt_in),
  createdAt: user.created_at,
});
