# Deploying Radar

Two ways to run it. Both serve the same site from `public/`.

## 1. Full product (accounts, tracker, admin)

Needs Node 22.5 or newer — nothing else. There are no npm dependencies.

```bash
node scripts/build-site.mjs          # regenerate public/ from pages/
node server/create-admin.js you@example.com 'a long passphrase'
node server/index.js                 # listens on $PORT, default 4173
```

The database is a single SQLite file at `data/radar.db`, created on first run
and seeded from `data/opportunities.json`. Back it up by copying that file
(stop the server first, or use `sqlite3 data/radar.db ".backup"`).

Run it behind a TLS-terminating proxy and forward `X-Forwarded-Proto: https`.
The session cookie is then issued `Secure`, and HSTS is sent.

```nginx
location / {
  proxy_pass http://127.0.0.1:4173;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `4173` | Port to listen on |
| `RADAR_DB` | `data/radar.db` | Database file |
| `RADAR_RESEED` | unset | `1` overwrites catalogue rows from the JSON seed on boot |

## 2. Static hosting (directory only)

Upload `public/` to any static host. There is no API, so the front end falls
back to the catalogue JSON and the browser's own storage, and says so on every
page that stores anything. Sign-up, matching, saving and the tracker all work,
but only in that one browser, and the report and contact forms are disabled
with an honest message rather than pretending to send.

## Before going live

- [ ] Set `origin` in `public/assets/js/config.js` and `ORIGIN` in
      `scripts/build-site.mjs` to the real domain, then rebuild.
- [ ] Set `contactEmail` in `public/assets/js/config.js`, or leave it `null` to
      keep pointing people at the contact form.
- [ ] Create the administrator account and verify the seeded listings.
- [ ] Run a link check from the admin console.
- [ ] Submit `sitemap.xml` to Search Console.
- [ ] Set up a backup of `data/radar.db`.

## Maintenance rhythm

| How often | What |
| --- | --- |
| Weekly | Clear the report queue; re-verify anything reported |
| Monthly | Run the link check; run the expiry pass |
| Quarterly | Re-verify listings older than 90 days (the admin overview lists them) |
| Annually | Update recurring programmes' dates as organisers publish them |
