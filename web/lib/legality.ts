// Per-game move legality so sets actually legalize when traded. Berichan injects
// into the selected game, where a Pokémon can only have moves it can learn in
// THAT game (Champions movepools are broader). Data: assets/data/legality.json
// (per species, SV + Legends Z-A learnsets from Serebii). Loaded lazily.

import { displayName } from "./teamParser";
import type { Pokemon } from "./types";

export type GameKey = "sv" | "za";

function toId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Map a Berichan trade command to a legality dataset key (null = not covered). */
export function gameKey(gameCommand: string): GameKey | null {
  if (gameCommand === "!tradeSV") return "sv";
  if (gameCommand === "!tradePLZ") return "za";
  return null; // SwSh / Legends Arceus not in this dataset yet
}

export const GAME_LABEL: Record<GameKey, string> = { sv: "Scarlet/Violet", za: "Legends Z-A" };

interface Entry { sv: Set<string>; za: Set<string>; any: Set<string> }
let cache: Record<string, Entry> | null = null;
let loading: Promise<void> | null = null;

export function loadLegality(): Promise<void> {
  if (cache) return Promise.resolve();
  if (loading) return loading;
  loading = (async () => {
    try {
      const r = await fetch("/data/legality.json");
      const d = await r.json();
      const out: Record<string, Entry> = {};
      for (const [id, v] of Object.entries(d.species ?? {})) {
        const g = v as { sv?: string[]; za?: string[] };
        const sv = new Set(g.sv ?? []);
        const za = new Set(g.za ?? []);
        out[toId(id)] = { sv, za, any: new Set([...sv, ...za]) };
      }
      cache = out;
    } catch {
      cache = {};
    }
  })();
  return loading;
}

function entry(speciesName: string): Entry | undefined {
  return cache ? cache[toId(speciesName)] : undefined;
}

/** Is the species present in this game at all (has a learnset)? */
export function speciesInGame(speciesName: string, key: GameKey): boolean {
  const e = entry(speciesName);
  return e ? e[key].size > 0 : true; // unknown species → don't flag
}

/** Move legal in a specific game (unknown species/data → not flagged). */
export function canLearnInGame(speciesName: string, move: string, key: GameKey): boolean {
  const e = entry(speciesName);
  if (!e || e[key].size === 0) return true; // no data / species not in game (handled separately)
  return e[key].has(toId(move));
}

/** Move learnable in any covered game — used for game-agnostic editor warnings. */
export function canLearnAny(speciesName: string, move: string): boolean {
  if (!cache || !move) return true;
  const e = entry(speciesName);
  if (!e) return true;
  return e.any.has(toId(move));
}

export interface LegalityIssue {
  pokemon: string;
  reason: string;
}

/** Problems that will stop a team legalizing in the given game. */
export function teamIssues(team: Pokemon[], key: GameKey | null): LegalityIssue[] {
  if (!key || !cache) return [];
  const issues: LegalityIssue[] = [];
  for (const mon of team) {
    const e = entry(mon.species);
    if (!e) continue; // unknown species → can't judge
    if (e[key].size === 0) {
      issues.push({ pokemon: displayName(mon), reason: `not available in ${GAME_LABEL[key]}` });
      continue;
    }
    const bad = mon.moves.filter((mv) => mv && !e[key].has(toId(mv)));
    if (bad.length) {
      issues.push({ pokemon: displayName(mon), reason: `can't learn ${bad.join(", ")} in ${GAME_LABEL[key]}` });
    }
  }
  return issues;
}
