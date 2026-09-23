# Deploying Radar

Pick one of two. The difference is whether students get real accounts.

| | Static | Full product |
| --- | --- | --- |
| Time | ~5 minutes | ~15 minutes |
| Cost | Free | A few dollars a month |
| Directory, search, filters | Yes | Yes |
| Matching with explanations | Yes | Yes |
| Accounts, saves, tracker | In one browser only, or real with Firebase | Real, across devices |
| Google sign-in | With Firebase | No |
| Contact and report forms | With Firebase | Working |
| Admin console | No | Yes |

**Static plus Firebase is the sweet spot for most people**: free hosting, free
accounts, Google sign-in, no server to keep alive. Deploy static first, then
follow `FIREBASE.md` — about ten minutes in the Firebase console.

You can start static today and move to the full product later without changing
any code — it is the same `public/` directory either way.

---

## Option A — Static, free, five minutes

Good for getting a link you can share now.

### Cloudflare Pages (recommended)

1. Go to **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git**.
2. Pick `gstn458/Almateh`, branch `claude/adoring-hamilton-dfktne`.
3. Set:
   - **Root directory:** `radar`
   - **Build command:** `node scripts/build-site.mjs`
   - **Output directory:** `public`
   - **Environment variable:** `NODE_VERSION` = `22`
4. Deploy. You get `your-project.pages.dev` immediately.

### Netlify

`netlify.toml` in this folder already has every setting. Import the repo and
Netlify reads it — just set the branch to `claude/adoring-hamilton-dfktne`.

### GitHub Pages

Works too, but you must commit the built `public/` (already committed) and
point Pages at it. Cloudflare or Netlify is less fiddly.

**What visitors get:** the whole site, the directory, matching and the tracker.
Without Firebase, everything they save lives in their own browser and Radar
tells them so on every page that stores anything, and the contact and report
forms refuse politely rather than pretending to send. With Firebase configured
(`FIREBASE.md`), all of that becomes real and syncs across devices.

---

## Option B — Full product

SQLite needs a disk that survives restarts. That is the one thing free tiers do
not give you, so this costs a few dollars a month.

### fly.io (cheapest, ~$2–3/month)

```bash
# once
curl -L https://fly.io/install.sh | sh

cd radar
fly launch --no-deploy --copy-config --name your-radar-name
fly volumes create radar_data --size 1 --region fra   # fra/cdg are closest to the UAE
fly deploy

# create your admin login
fly ssh console -C "node server/create-admin.js you@example.com 'a long passphrase'"
```

`fly.toml` and `Dockerfile` are already here and already configured: the volume
mounts at `/data`, the database lives at `/data/radar.db`, HTTPS is forced, and
it runs a single machine because SQLite is one file on one disk.

### Render (simplest UI, $7/month)

1. Push this branch.
2. **New → Blueprint**, point it at the repo. It reads `render.yaml`.
3. Deploy, then open the shell tab and run:
   `node server/create-admin.js you@example.com 'a long passphrase'`

The blueprint attaches a 1GB disk at `/var/data`. **Do not downgrade to the free
plan** — free Render services have no disk and wipe every account on restart.

### Railway

Same shape: import the repo, set root directory `radar`, start command
`node server/index.js`, attach a volume, and set `RADAR_DB` to a path inside it.

### Anywhere else with Node 22.5+

```bash
node scripts/build-site.mjs
node server/create-admin.js you@example.com 'a long passphrase'
PORT=4173 node server/index.js
```

Put it behind a TLS proxy that forwards `X-Forwarded-Proto: https` — the session
cookie is then issued `Secure` and HSTS is sent.

```nginx
location / {
  proxy_pass http://127.0.0.1:4173;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## Your own domain

Once you have one, run this and commit — it sets the canonical URLs, Open Graph
tags, sitemap and share links in one go:

```bash
node scripts/set-domain.mjs https://radar.yourdomain.com
node scripts/set-domain.mjs https://radar.yourdomain.com hello@yourdomain.com   # with a real inbox
```

Leave the email off and the site keeps pointing people at the contact form,
which is the honest default while you have no mailbox.

Then point the DNS at your host (Cloudflare Pages, Netlify and Fly all give you
a CNAME target and handle the certificate).

---

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `4173` | Port to listen on |
| `RADAR_DB` | `data/radar.db` | Database file — put this on your persistent disk |
| `RADAR_RESEED` | unset | `1` overwrites catalogue rows from the JSON seed on boot |

## Backups

The whole database is one file. Copy it:

```bash
fly ssh console -C "cp /data/radar.db /data/backup.db" && fly sftp get /data/backup.db
```

Do this before any deploy that changes `server/schema.sql`.

## Before you tell people about it

- [ ] Run `node scripts/set-domain.mjs` with your real domain.
- [ ] If using Firebase: publish `firestore.rules` and add your domain to
      Authentication → Authorized domains.
- [ ] Create the admin account and verify the seeded listings.
- [ ] Run a link check from the admin console.
- [ ] Work through the 36 listings marked "needs review" — open each official
      page, confirm the deadline, click **Mark verified**.
- [ ] Submit `sitemap.xml` to Google Search Console.
- [ ] Set up a backup of the database.

## Maintenance rhythm

| How often | What |
| --- | --- |
| Weekly | Clear the report queue; re-verify anything reported |
| Monthly | Run the link check; run the expiry pass |
| Quarterly | Re-verify listings older than 90 days (the admin overview lists them) |
| Annually | Update recurring programmes' dates as organisers publish them |
