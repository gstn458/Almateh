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
  src/js/                the scripts, in source form — edit these
  public/                the built site; this directory is what gets deployed
    assets/css/          radar.css (system) + hero.css (homepage only)
    assets/js/           one module per page, plus api/ui/config/matching
                         and the three backends: server (fetch), firebase, local
    data/                the catalogue, published so static hosting works
    app/  admin/         student application and administrative console
  server/                HTTP server, API, SQLite schema, auth, iCalendar
  firestore.rules        who may read and write what, when running on Firebase
  data/                  opportunities.json (seed) and radar.db (runtime)
  scripts/               build, asset rendering, and the three test suites
```

### Why a build step

Every page's header, footer, metadata and structured data come from
`scripts/build-site.mjs`, but the output is plain HTML. Navigation, headings and
copy are all in the markup, so the site works with JavaScript disabled and
search engines see the real content.

The build also stamps a version onto every asset URL — in the HTML and in each
module's own import specifiers. Scripts keep their filenames between deploys,
so without it a browser with the site cached keeps running old code; the
version makes an updated file a different URL. The id is a hash of the sources,
so it only changes when they do.

Edit `pages/` and `src/js/`, never `public/`.

## How it fits together

**One matching engine.** `public/assets/js/matching.js` is imported unchanged by
the server and the browser, so a score can never differ between them. Nine
signals — level, subjects, goals, location, funding, citizenship, deadline
reachability, experience and preferred type — produce a percentage, and every
score carries the reasons that made it and the blockers that count against it.
A number without an explanation never reaches the interface.

**One data layer, three backends.** `api.js` probes once and picks:

| Mode | When | Accounts |
| --- | --- | --- |
| `server` | the Node API answers | Real, in SQLite, plus the admin console |
| `firebase` | a Firebase project is configured and no server is running | Real, in Firestore, with Google sign-in |
| `local` | neither | This browser only, and the page says so |

All three answer the same routes, so no page branches on which is running.
`firebase-backend.js` is what makes accounts real on static hosting: no server
to run, yet a student signs in on their phone and finds what they saved on a
school computer. See `FIREBASE.md` to switch it on.

The catalogue stays out of Firestore — it is the same file for everyone and
costs nothing from the edge, so only what belongs to a person is stored there,
under `users/{uid}`, with `firestore.rules` keeping it there. If Firebase is
unreachable, reading the catalogue still works; only the personal layer is
missing.

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
| `node scripts/firebase-test.mjs` | The Firebase backend's routes against a fake SDK: auth, profile, saves, tracker, reminders, export, deletion, Google sign-in, and that nothing is written outside `users/`, `reports/` and `messages/` |
| `node scripts/browser-test.mjs` | Console errors, overflow, headings, labels, touch targets, focus, colliding hero controls across seven viewports, the journey in a real browser, reduced motion, no-JavaScript |

The browser suite needs Chromium and `playwright-core`; the other two need
nothing but a running server.

## When something is wrong in someone else's browser

`/app/diagnostics.html` reports the deployed build id, which backend is
serving, the Firebase configuration in use, whether the SDK loaded, and the
raw error from a real sign-in attempt. One screenshot of that page carries
what would otherwise take a dozen questions.

## What is deliberately not built

Email delivery (so no password reset by email, and reminders surface in-app —
Firebase can send both later from its own templates),
browser push notifications, continuous monitoring of organiser pages, payments,
and counsellor cohort views. Each is either absent from the interface or
labelled as not yet built. See `DEPLOY.md` for the launch checklist.
