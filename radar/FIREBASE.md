# Turning on accounts with Firebase

This gives Radar real accounts — sign in with Google or an email address, and
your saves and tracker follow you between devices — without running a server.
It works on the Cloudflare deploy you already have.

Free tier covers a student project comfortably: 50,000 Firestore reads and
20,000 writes a day, unlimited Google sign-ins.

Roughly ten minutes, all of it in the Firebase console.

---

## 1. Create the project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and
   **Add project**. Call it `radar`.
2. Turn **Google Analytics off** when it asks. Radar does not use it, and it is
   one less thing collecting data about students.

## 2. Turn on the sign-in methods

**Build → Authentication → Get started**, then under **Sign-in method** enable:

- **Google** — pick a support email when it asks (your own is fine).
- **Email/Password** — leave "Email link" off.

## 3. Create the database

**Build → Firestore Database → Create database**.

- Start in **production mode** (locked). The rules in this repo replace the
  defaults in step 5.
- Pick a location near your users — `europe-west1` or `asia-south1` are both
  sensible from the UAE. **This cannot be changed later.**

## 4. Get your config into Radar

**Project settings** (the gear) **→ Your apps → Web** (the `</>` icon). Register
the app — no hosting needed — and copy the `firebaseConfig` object.

Paste it into `radar/public/assets/js/firebase-config.js` and set
`enabled: true`:

```js
export const FIREBASE = {
  enabled: true,
  config: {
    apiKey: 'AIza…',
    authDomain: 'radar-xxxxx.firebaseapp.com',
    projectId: 'radar-xxxxx',
    storageBucket: 'radar-xxxxx.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:abc123',
  },
  …
};
```

These values are not secrets. Firebase puts them in the page of every web app
it generates — they name the project, they do not grant anything. What actually
protects student data is the rules file in the next step.

## 5. Publish the security rules

This is the step that matters. Without it, anyone could read every student's
data, or with the default locked rules, nothing works at all.

**Firestore Database → Rules**, paste the whole contents of
`radar/firestore.rules`, and **Publish**.

They say: a signed-in person can touch only the documents under their own user
id; reports and contact messages can be created by anyone but read by nobody;
everything else in the database is closed.

Or from a terminal, if you have the Firebase CLI:

```bash
cd radar
npx firebase-tools deploy --only firestore:rules
```

## 6. Authorise your domain

**Authentication → Settings → Authorized domains → Add domain**, and add the
domain Radar is served from:

```
almateh.<your-subdomain>.workers.dev
```

Add your custom domain here too when you have one. Without this, Google
sign-in fails with "unauthorized domain".

## 7. Deploy

```bash
git add radar/public/assets/js/firebase-config.js
git commit -m "Enable Firebase"
git push
```

Cloudflare rebuilds. The **Continue with Google** button appears on the sign-in
and sign-up pages on its own — it stays hidden until a project is configured,
so a half-finished setup never shows a button that cannot work.

---

## Checking it worked

1. Open your site → **Create account** → **Continue with Google**.
2. Finish the six onboarding questions.
3. Save something.
4. Open the site on your phone, sign in with the same Google account — the save
   should be there.
5. In the Firebase console, **Firestore → Data**, you should see
   `users/<your uid>` with your profile under it.

## When something goes wrong

| What you see | What it means |
| --- | --- |
| `auth/unauthorized-domain` | Step 6 — add the domain to Authorized domains. |
| `auth/operation-not-allowed` | Step 2 — that provider is not enabled. |
| "Firestore refused that write" | Step 5 — rules not published, or still the locked defaults. |
| "Could not reach Firebase" | The SDK could not load. Check the network, or a blocker stopping `gstatic.com`. |
| The Google button never appears | `enabled` is still `false`, the config is empty, or the Node API is answering — the server owns the session when it is running, and Google sign-in belongs to Firebase mode. |

## What this does and does not change

**Now real:** accounts, profiles, saves, the tracker, notes, checklists,
reminders — all synced across devices. The contact and report forms work too,
writing into Firestore collections only you can read from the console.

**Still not built:** email delivery, so there is no password reset email and
reminders appear in-app rather than in an inbox. Password reset can be turned
on later from Firebase's own templates.

**The catalogue does not move.** The 44 listings stay in
`data/opportunities.json`, served as static JSON from the edge. Editing them
means running the Radar server locally, using the admin console, then
committing and pushing:

```bash
node server/index.js                      # admin console at /admin/
# edit, verify, expire listings…
# then export back to the seed file and push:
git add data/opportunities.json && git commit -m "Update catalogue" && git push
```

That keeps every catalogue change in git history, and keeps Firestore costs to
what students actually create.

## Cost

Each student costs a handful of Firestore reads per page and a write per save.
The free tier is 50,000 reads and 20,000 writes a day. You would need hundreds
of active students daily before that mattered, and Firebase will not silently
bill you — the free plan simply stops until the next day unless you deliberately
upgrade.
