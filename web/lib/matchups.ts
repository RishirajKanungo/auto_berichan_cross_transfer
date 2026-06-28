// "Vs the meta" matchup math: build calc sides for the user's team and for the
// most-used set of each top meta Pokémon, then read KO rolls both ways. Reuses
// the same @smogon/calc engine as the damage-calc tab so numbers match exactly.

import { calcMove, type CalcSide, type FieldConfig } from "./calc";
import { evToSp, STAT_ORDER, type StatLabel } from "./stats";
import { recommended, type MetaData, type MetaIndexEntry } from "./meta";
import type { Pokemon } from "./types";

/** Convert our roster naming ("Hisuian Arcanine", "Mega Garchomp", "Indeedee
 *  Female") to the Showdown species names @smogon/calc expects. */
export function toCalcSpecies(name: string): string {
  for (const [word, suffix] of [["Alolan", "Alola"], ["Galarian", "Galar"], ["Hisuian", "Hisui"], ["Paldean", "Paldea"]] as const) {
    if (name.startsWith(`${word} `)) return `${name.slice(word.length + 1)}-${suffix}`;
  }
  if (name.startsWith("Mega ")) {
    const rest = name.slice(5);
    const m = rest.match(/^(.*) ([XY])$/);
    return m ? `${m[1]}-Mega-${m[2]}` : `${rest}-Mega`;
  }
  if (name.endsWith(" Female")) return `${name.slice(0, -7)}-F`;
  if (name.endsWith(" Male")) return name.slice(0, -5); // male is the default form
  return name;
}

const emptySp = (): Record<StatLabel, number> => ({ HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 });

/** A team Pokémon → calc side (mainline EVs back to Champions SP). */
export function pokemonToCalcSide(mon: Pokemon): CalcSide {
  const sp = emptySp();
  for (const label of STAT_ORDER) sp[label] = evToSp(mon.evs[label] ?? 0);
  return {
    species: toCalcSpecies(mon.species),
    level: mon.level || 50,
    nature: mon.nature,
    item: mon.item,
    ability: mon.ability,
    teraType: mon.teraType,
    tera: false,
    status: "",
    sp,
    boosts: {},
    moves: mon.moves.filter(Boolean),
  };
}

/** A meta Pokémon's most-used set → calc side. */
export function metaToCalcSide(entry: MetaIndexEntry, meta: MetaData): CalcSide {
  const rec = recommended(meta);
  return {
    species: toCalcSpecies(entry.name),
    level: 50,
    nature: rec.nature,
    item: rec.item,
    ability: rec.ability,
    teraType: "",
    tera: false,
    status: "",
    sp: rec.spread ? { ...emptySp(), ...rec.spread } : emptySp(),
    boosts: {},
    moves: rec.moves.filter(Boolean),
  };
}

export interface Hit {
  move: string;
  minPct: number;
  maxPct: number;
}

/** Best (highest-rolling) damaging move from `moves` of att vs def. */
export function bestHit(att: CalcSide, def: CalcSide, fc: FieldConfig): Hit | null {
  let best: Hit | null = null;
  for (const move of att.moves) {
    const r = calcMove(att, def, move, fc);
    if (!r || r.maxPct <= 0) continue;
    if (!best || r.maxPct > best.maxPct) best = { move, minPct: r.minPct, maxPct: r.maxPct };
  }
  return best;
}

/** Number of clean hits to KO at best/worst roll (ignores residual), for display. */
export function koLabel(hit: Hit | null): string {
  if (!hit || hit.maxPct <= 0) return "—";
  const best = Math.ceil(100 / hit.maxPct);              // fewest hits (high roll)
  const worst = hit.minPct > 0 ? Math.ceil(100 / hit.minPct) : best;
  const tag = (n: number) => (n === 1 ? "OHKO" : `${n}HKO`);
  if (best === worst) return tag(best);
  return best === 1 ? "OHKO?" : `${best}–${worst}HKO`;
}

/** Severity 0–3 for colouring (3 = OHKO). */
export function koSeverity(hit: Hit | null): number {
  if (!hit || hit.maxPct <= 0) return -1;
  const n = Math.ceil(100 / hit.maxPct);
  return n <= 1 ? 3 : n === 2 ? 2 : n === 3 ? 1 : 0;
}
