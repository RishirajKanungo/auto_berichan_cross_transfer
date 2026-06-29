# Berichan Trader

A team-building and strategy companion for **Pokémon Champions** VGC, in your
browser. Build a team, see what the ladder is running, plan your speed control,
stress-test your matchups, and tune your spreads — then share it with a link.

Built with **Next.js**, **TypeScript**, and **Tailwind**, and deployed on Vercel.

## Features

- **Team Builder** — the full legal Champions roster with sprites, items, moves,
  and abilities. Edit each Pokémon with the Stat-Point editor (sliders + radial),
  with live legality checks and a Showdown character counter.
- **Meta** — Pokémon ranked by ladder usage, each with its most-used moves,
  items, abilities, natures, EV spreads, and common partners. Filter by role
  (Trick Room, Tailwind, Fake Out, redirection, Intimidate, weather, priority) or
  browse the most-used cores. Pull any set straight onto your team.
- **Team Analysis** — a live defensive type matrix, shared-weakness and coverage
  callouts, and a "vs the meta" matrix showing how each of your Pokémon trades
  against the top threats, both ways.
- **Speed Tiers** — every Pokémon across the standard speed benchmarks (base,
  min, max, Scarf, and more), with a compare-vs-the-field tool and a **turn
  simulator** that resolves move order across priority, Trick Room, Tailwind,
  paralysis, abilities, items, terrain, and field effects.
- **Team Preview** — enter the opponent's six and instantly see the combined
  speed order, your best answers and biggest threats, and "watch out for"
  callouts.
- **EV / SP optimizer** — solve the minimum investment to survive a specific
  attack or guarantee a KO, right inside the editor.
- **Damage Calculator** — Showdown-accurate damage rolls (powered by
  `@smogon/calc`).
- **Sharing** — import from / export to Poképaste, or copy a link that opens your
  team in the builder.
- **Comfort** — light/dark themes and an adjustable display size for large and
  high-DPI screens.

Teams are stored in your browser; no account is required.

## Run locally

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · `@smogon/calc`. Competitive
usage data is sourced from public Pokémon Champions community databases.

---

Pokémon and Pokémon character names are trademarks of Nintendo / Game Freak /
The Pokémon Company. This is an unofficial fan project and is not affiliated with
or endorsed by them.
