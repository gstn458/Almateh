# Radar

A verified opportunity directory, a matching engine that explains itself, and
an application tracker — for students who would otherwise never hear about the
competitions, research programmes, scholarships and fellowships they qualify
for.

Built from the original single-file prototype into a complete product: a public
website, a student application, an administrative system, and a real database
behind all three.

```bash
node scripts/build-site.mjs   # build public/ from pages/
node server/index.js          # http://localhost:4173
npm run test:all              # journey, admin and browser suites
```

No npm dependencies. Node 22.5+ (for the built-in `node:sqlite`).

## The journey it supports

Discover → create an account → build a profile → receive personalised matches →
open a full opportunity page → save it → add it to an application plan → track
progress → get reminders → record the outcome → come back and see everything on
a dashboard. Each step is exercised by `scripts/journey-test.mjs`.

## Layout

```
radar/
  pages/                 page bodies — the only place page content is written
  public/                the built site; this directory is what gets deployed
    assets/css/          radar.css (system) + hero.css (homepage only)
    assets/js/           one module per page, plus api/ui/config/matching
    data/                the catalogue, published so static hosting works
    app/  admin/         student application and administrative console
  server/                HTTP server, API, SQLite schema, auth, iCalendar
  data/                  opportunities.json (seed) and radar.db (runtime)
  scripts/               build, asset rendering, and the three test suites
```

### Why a build step

Every page's header, footer, metadata and structured data come from
`scripts/build-site.mjs`, but the output is plain HTML. Navigation, headings and
copy are all in the markup, so the site works with JavaScript disabled and
search engines see the real content. Edit `pages/`, never `public/*.html`.

## How it fits together

**One matching engine.** `public/assets/js/matching.js` is imported unchanged by
the server and the browser, so a score can never differ between them. Nine
signals — level, subjects, goals, location, funding, citizenship, deadline
reachability, experience and preferred type — produce a percentage, and every
score carries the reasons that made it and the blockers that count against it.
A number without an explanation never reaches the interface.

**One data layer, two backends.** `api.js` probes for the API once. When it
answers, everything goes to the server and the SQLite database. When it does
not — static hosting, a dropped connection — `local-backend.js` answers the same
routes from the catalogue JSON and the browser's storage, and the interface says
plainly that the data is staying in this browser. Pages never branch on which is
running.

**Honesty as a design constraint.** A listing shows `verified` with the date a
person last read the official page, or `needs review` on its face. No deadline
is asserted that the organiser has not published. The interface does not claim
automatic deadline monitoring, because there is none yet
(`SITE.automaticDeadlineMonitoring` in `config.js` governs that copy). Paid
tiers are marked "not built" and offer a waitlist rather than a checkout.

## The database

SQLite via `node:sqlite`. Tables: `users`, `sessions`, `profiles`,
`opportunities`, `saves`, `applications`, `application_events`,
`checklist_items`, `reminders`, `reports`, `messages`, `audit_log`,
`analytics_events`. The schema is `server/schema.sql` and is applied on boot.

Passwords are scrypt hashes with a per-user salt, compared in constant time.
Sessions are opaque tokens in HttpOnly, SameSite=Lax cookies. Account deletion
removes the profile, saves, applications, notes and reminders outright and
leaves only an anonymised tombstone so a later sign-up with the same address
cannot inherit anything.

## Analytics

Counts, not surveillance. Each row holds an event name, a coarse bucket and a
timestamp — no user id, no session id, no IP, no page trail — so the data cannot
be joined back to a person, and students can switch even that off in settings.
The admin overview reads them to answer one question: are students getting from
finding something to actually submitting an application?

## Administration

`/admin/` needs an administrator account (`node server/create-admin.js`). It
covers the catalogue (add, edit, verify, feature, expire, delete), the report
queue, contact and waitlist messages, accounts, an automated link check across
every application URL, and an audit log of who changed what. Marking a listing
verified asks for confirmation that the official page was actually opened,
because that is the only thing the badge means.

The users table shows counts and account state. It deliberately does not show
profile answers, saved opportunities or application notes: administering the
service does not require reading a student's private planning.

## Accessibility

Skip link, one `h1` per page and no skipped heading levels, labels on every
control, visible focus on everything interactive, a focus-trapped mobile menu
that restores focus on close, live-region announcements for saves and stage
changes, status conveyed by text as well as colour, all secondary text above
4.5:1 contrast, 44px touch targets, a full `prefers-reduced-motion` path, and
sound off by default with the choice remembered. `scripts/browser-test.mjs`
checks these on every page at three viewports.

## Performance

The globe's two textures are separate `.webp` files rather than a megabyte of
base64 in the HTML, so they cache and the document stays small. Fonts load
non-blocking with a system fallback. The globe animation stops when the hero
scrolls out of view or the tab is hidden, and is dropped entirely on two-core
devices and data-saver connections — the hero is designed to still read as Radar
without it. Assets are served gzipped with a week of cache; HTML revalidates.

## Testing

| Command | What it covers |
| --- | --- |
| `node scripts/journey-test.mjs` | The full student journey, auth, authorisation, privacy, calendar, security headers |
| `node scripts/admin-test.mjs` | Catalogue editing, verification, expiry, reports, audit |
| `node scripts/browser-test.mjs` | Console errors, overflow, headings, labels, touch targets, focus, the journey in a real browser, reduced motion, no-JavaScript |

The browser suite needs Chromium and `playwright-core`; the other two need
nothing but a running server.

## What is deliberately not built

Email delivery (so no password reset by email, and reminders surface in-app),
browser push notifications, continuous monitoring of organiser pages, payments,
and counsellor cohort views. Each is either absent from the interface or
labelled as not yet built. See `DEPLOY.md` for the launch checklist.
