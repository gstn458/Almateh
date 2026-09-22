-- Radar database schema.
-- Everything a student creates lives here, not in the browser, so an account
-- carries across devices and can be exported or deleted on request.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT '',
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'student',   -- student | admin
  -- Minors: recorded so data handling and email can follow the stricter path.
  is_minor        INTEGER NOT NULL DEFAULT 0,
  email_opt_in    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  last_seen_at    TEXT,
  deleted_at      TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- One row per student. `profile_json` holds the answers from onboarding;
-- the columns beside it are the fields matching reads on every request.
CREATE TABLE IF NOT EXISTS profiles (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level           TEXT,
  year_or_grade   TEXT,
  country         TEXT,
  city            TEXT,
  citizenship     TEXT,
  subjects_json   TEXT NOT NULL DEFAULT '[]',
  goals_json      TEXT NOT NULL DEFAULT '[]',
  types_json      TEXT NOT NULL DEFAULT '[]',
  regions_json    TEXT NOT NULL DEFAULT '[]',
  funding_need    TEXT,
  experience      TEXT,
  availability    TEXT,
  willing_to_travel INTEGER NOT NULL DEFAULT 1,
  notes           TEXT NOT NULL DEFAULT '',
  completed_at    TEXT,
  updated_at      TEXT NOT NULL
);

-- The catalogue. Seeded from data/opportunities.json, then owned by admins.
CREATE TABLE IF NOT EXISTS opportunities (
  id                  TEXT PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  data_json           TEXT NOT NULL,
  deadline            TEXT,
  type                TEXT NOT NULL,
  region              TEXT,
  verification_status TEXT NOT NULL DEFAULT 'needs-review',
  verified_at         TEXT,
  verified_by         TEXT,
  link_checked_at     TEXT,
  link_status         TEXT,
  is_expired          INTEGER NOT NULL DEFAULT 0,
  is_featured         INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);

CREATE TABLE IF NOT EXISTS saves (
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  PRIMARY KEY (user_id, opportunity_id)
);

-- An application is a saved opportunity a student has started moving on.
CREATE TABLE IF NOT EXISTS applications (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id  TEXT NOT NULL,
  stage           TEXT NOT NULL DEFAULT 'saved',
  notes           TEXT NOT NULL DEFAULT '',
  contacts        TEXT NOT NULL DEFAULT '',
  applied_on      TEXT,
  result_on       TEXT,
  outcome         TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (user_id, opportunity_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);

-- Append-only: the progress history shown on the tracker.
CREATE TABLE IF NOT EXISTS application_events (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_stage     TEXT,
  to_stage       TEXT NOT NULL,
  note           TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  done           INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL,
  remind_on      TEXT NOT NULL,
  channel        TEXT NOT NULL DEFAULT 'in-app',  -- in-app | email | browser
  label          TEXT NOT NULL DEFAULT '',
  sent_at        TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id, remind_on);

-- Student-reported problems with a listing: the correction loop for the catalogue.
CREATE TABLE IF NOT EXISTS reports (
  id             TEXT PRIMARY KEY,
  opportunity_id TEXT,
  user_id        TEXT,
  reason         TEXT NOT NULL,
  detail         TEXT NOT NULL DEFAULT '',
  contact_email  TEXT,
  status         TEXT NOT NULL DEFAULT 'open',   -- open | reviewing | resolved | rejected
  resolution     TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  resolved_at    TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL DEFAULT 'contact',  -- contact | waitlist
  name          TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL,
  subject       TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new',
  created_at    TEXT NOT NULL
);

-- Who changed what in the catalogue, so a listing can always be traced.
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT,
  actor_email TEXT,
  action      TEXT NOT NULL,
  subject     TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);

-- Product analytics. Names an event and a coarse bucket only: no free text,
-- no page-by-page trail, and no identifier that outlives the row.
CREATE TABLE IF NOT EXISTS analytics_events (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  bucket      TEXT NOT NULL DEFAULT '',
  surface     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_name ON analytics_events(name, created_at);
