# Enabling accounts: Twitch sign-in + cloud team storage

Out of the box the web app needs **no** setup — teams save to the browser
(localStorage) and there's no login. To turn on **Twitch sign-in** (primary) and
**per-account team storage** (and optionally Google sign-in), do the steps below,
then redeploy.

Replace `https://berichan-trader.vercel.app` with your real Vercel URL if different.

---

## 1. Create a Twitch application

1. Go to <https://dev.twitch.tv/console/apps> → **Register Your Application**.
2. **Name:** anything (e.g. "Berichan Trader Web").
3. **OAuth Redirect URLs** — add both:
   - `https://berichan-trader.vercel.app/api/auth/callback/twitch`
   - `http://localhost:3000/api/auth/callback/twitch`  (for local dev)
4. **Category:** Website Integration → **Create**.
5. Open the app → copy the **Client ID**, then **New Secret** → copy the **Client Secret**.

## 2. (Optional) Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services →
   Credentials → Create Credentials → OAuth client ID → Web application**.
2. **Authorized redirect URIs:**
   - `https://berichan-trader.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
3. Copy the **Client ID** and **Client Secret**.

## 3. Generate an auth secret

Run one of:
```bash
npx auth secret        # prints a value
# or: openssl rand -base64 33
```

## 4. Provision a database (stores saved teams)

Easiest path (Vercel-native):
- Vercel dashboard → your project → **Storage → Create Database → Postgres (Neon)**.
- This auto-adds `DATABASE_URL` (and `POSTGRES_URL`) to the project's env.

Or: create a free database at <https://neon.tech>, and copy its connection string
as `DATABASE_URL`. The `teams` table is created automatically on first use.

## 5. Set environment variables

Vercel → Project → **Settings → Environment Variables** (Production + Preview):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` |
| `AUTH_SECRET` | from step 3 |
| `AUTH_TWITCH_ID` | Twitch Client ID |
| `AUTH_TWITCH_SECRET` | Twitch Client Secret |
| `AUTH_GOOGLE_ID` | (optional) Google Client ID |
| `AUTH_GOOGLE_SECRET` | (optional) Google Client Secret |
| `DATABASE_URL` | only if not auto-added by Vercel Postgres |
| `AUTH_URL` | `https://berichan-trader.vercel.app` |

## 6. Redeploy

Trigger a redeploy (Deployments → ⋯ → **Redeploy**, or push a commit). A fresh
build is required because `NEXT_PUBLIC_AUTH_ENABLED` is read at build time. After
it deploys, a **Sign in with Twitch** button appears in the sidebar, and saved
teams are stored on your account.

## Local development

Create `web/.env.local` (gitignored) with the same variables but the `localhost`
redirect URIs, then `npm run dev`.
