# Berichan Trader — Web (Team Builder)

A web version of the Berichan Trader team builder, built with **Next.js + TypeScript
+ Tailwind**, designed to deploy on **Vercel**. It mirrors the desktop app's look
(Windows / Material / Glass themes) and reuses the same Champions dataset.

**Phase 1 (this app):** browse the legal Pokémon Champions roster with sprites,
items, moves and abilities; build / import / export teams; edit each Pokémon with
the Stat-Point editor (slider + radial). Teams are saved in your browser
(localStorage). No login required.

**Phase 2 (planned):** Twitch login + in-browser trading; Google sign-in + cloud
team storage.

## Develop locally

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (what Vercel runs)
```

## Data

The dataset (roster, items, moves, abilities) and all sprites/icons live in
`public/` and are **synced from the desktop app's `../assets/`**:

```bash
node scripts/sync-assets.mjs   # re-copy ../assets -> public/ after regenerating data
```

These files are committed so Vercel (which builds from this `web/` folder) serves
them directly.

## Deploy to Vercel

1. Push this repo to GitHub (the `web/` folder lives inside `berichan-trader`).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the
   **berichan-trader** repo.
3. **Set Root Directory to `web`** (important — the app is in this subfolder).
   Vercel auto-detects **Next.js**; no other config needed for Phase 1.
4. **Deploy.** You'll get a `https://<name>.vercel.app` URL. Every push to `main`
   auto-deploys; pull requests get preview URLs.

No environment variables are required for Phase 1.
