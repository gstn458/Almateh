/**
 * SQLite access. Uses node:sqlite, which ships with Node 22, so Radar's
 * backend runs with no install step and no external database service.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DB_PATH = process.env.RADAR_DB || join(ROOT, 'data', 'radar.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec(readFileSync(join(ROOT, 'server', 'schema.sql'), 'utf8'));

export const now = () => new Date().toISOString();
export const id = () => randomUUID();

export const all = (sql, ...params) => db.prepare(sql).all(...params);
export const get = (sql, ...params) => db.prepare(sql).get(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);

/**
 * Loads the catalogue from data/opportunities.json into the database once.
 * Existing rows are left alone: after launch the database is the source of
 * truth and the JSON file is only the initial seed.
 */
export function seedCatalogue({ force = false } = {}) {
  const file = join(ROOT, 'data', 'opportunities.json');
  if (!existsSync(file)) return 0;
  const catalogue = JSON.parse(readFileSync(file, 'utf8'));
  const insert = db.prepare(`
    INSERT INTO opportunities
      (id, slug, data_json, deadline, type, region, verification_status,
       verified_at, link_checked_at, is_expired, is_featured, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      data_json = CASE WHEN ? THEN excluded.data_json ELSE opportunities.data_json END,
      updated_at = CASE WHEN ? THEN excluded.updated_at ELSE opportunities.updated_at END
  `);
  const stamp = now();
  let count = 0;
  for (const [index, o] of catalogue.entries()) {
    insert.run(
      o.id, o.slug, JSON.stringify(o), o.deadline ?? null, o.type, o.region ?? null,
      o.verificationStatus ?? 'needs-review', o.verifiedAt ?? null, o.linkCheckedAt ?? null,
      index < 3 ? 1 : 0, stamp, stamp,
      force ? 1 : 0, force ? 1 : 0,
    );
    count += 1;
  }
  return count;
}

/** Turns a catalogue row back into the shape the rest of the app expects. */
export function rowToOpportunity(row) {
  const data = JSON.parse(row.data_json);
  return {
    ...data,
    verificationStatus: row.verification_status,
    verifiedAt: row.verified_at,
    linkCheckedAt: row.link_checked_at,
    linkStatus: row.link_status,
    isExpired: Boolean(row.is_expired),
    isFeatured: Boolean(row.is_featured),
  };
}

export function listOpportunities({ includeExpired = true } = {}) {
  const rows = all(
    `SELECT * FROM opportunities ${includeExpired ? '' : 'WHERE is_expired = 0'} ORDER BY is_featured DESC, deadline IS NULL, deadline ASC`,
  );
  return rows.map(rowToOpportunity);
}

export function getOpportunity(idOrSlug) {
  const row = get('SELECT * FROM opportunities WHERE id = ? OR slug = ?', idOrSlug, idOrSlug);
  return row ? rowToOpportunity(row) : null;
}

export function audit(actor, action, subject, detail = '') {
  run(
    'INSERT INTO audit_log (id, actor_id, actor_email, action, subject, detail, created_at) VALUES (?,?,?,?,?,?,?)',
    id(), actor?.id ?? null, actor?.email ?? null, action, subject, detail, now(),
  );
}
