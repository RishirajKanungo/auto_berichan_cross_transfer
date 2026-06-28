// Parse Pokémon Showdown exports into structured sets and serialize them back.
// Ported from berichan/team_parser.py — the round-trip must stay identical.

import { SP_MAX_PER_STAT, SP_MAX_TOTAL, STAT_ORDER, spSpreadToEvs, type StatLabel } from "./stats";
import type { Pokemon } from "./types";

export const TWITCH_MAX_CHAT_LENGTH = 500;
export const DEFAULT_IV = 31;

export function emptyEvs(): Record<StatLabel, number> {
  return { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
}
export function defaultIvs(): Record<StatLabel, number> {
  return { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 };
}

export function newPokemon(partial: Partial<Pokemon> = {}): Pokemon {
  return {
    nickname: "", species: "", lines: [], rawBlock: "",
    gender: "", item: "", ability: "", level: 0, shiny: false,
    teraType: "", nature: "", evs: emptyEvs(), ivs: defaultIvs(), moves: [],
    ...partial,
  };
}

export function chatMessage(mon: Pokemon): string {
  return mon.lines.join(" ");
}

export function displayName(mon: Pokemon): string {
  if (mon.nickname && mon.nickname !== mon.species) return `${mon.nickname} (${mon.species})`;
  return mon.species || mon.nickname;
}

// --- serialization ---------------------------------------------------

function statLine(stats: Record<StatLabel, number>, def: number): string {
  return STAT_ORDER.filter((s) => (stats[s] ?? def) !== def)
    .map((s) => `${stats[s]} ${s}`)
    .join(" / ");
}

function headerLine(mon: Pokemon): string {
  let name = mon.species || mon.nickname;
  if (mon.nickname && mon.nickname !== mon.species) name = `${mon.nickname} (${mon.species})`;
  if (mon.gender === "M" || mon.gender === "F") name = `${name} (${mon.gender})`;
  if (mon.item) name = `${name} @ ${mon.item}`;
  return name;
}

export function toShowdown(mon: Pokemon): string {
  const out: string[] = [headerLine(mon)];
  if (mon.ability) out.push(`Ability: ${mon.ability}`);
  if (mon.level) out.push(`Level: ${mon.level}`);
  if (mon.shiny) out.push("Shiny: Yes");
  if (mon.teraType) out.push(`Tera Type: ${mon.teraType}`);
  const ev = statLine(mon.evs, 0);
  if (ev) out.push(`EVs: ${ev}`);
  if (mon.nature) out.push(`${mon.nature} Nature`);
  const iv = statLine(mon.ivs, DEFAULT_IV);
  if (iv) out.push(`IVs: ${iv}`);
  for (const move of mon.moves) if (move) out.push(`- ${move}`);
  return out.join("\n");
}

/** Regenerate `lines`/`rawBlock` from the structured fields (after edits). */
export function syncLines(mon: Pokemon): Pokemon {
  const rawBlock = toShowdown(mon);
  return { ...mon, rawBlock, lines: rawBlock.split("\n").filter((l) => l.trim()) };
}

// --- parsing ---------------------------------------------------------

function parseHeader(firstLine: string): { nickname: string; species: string; gender: string; item: string } {
  let base = firstLine.trim();
  let item = "";
  const at = base.indexOf("@");
  if (at >= 0) {
    item = base.slice(at + 1).trim();
    base = base.slice(0, at).trim();
  }
  let gender = "";
  const gm = /\(([MF])\)/.exec(base);
  if (gm) {
    gender = gm[1];
    base = base.replace(/\s*\([MF]\)\s*/, " ").trim();
  }
  const paren = [...base.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  let species: string, nickname: string;
  if (paren.length) {
    species = paren[0];
    nickname = base.split("(")[0].trim() || species;
  } else {
    species = base;
    nickname = base;
  }
  return { nickname, species, gender, item };
}

function parseStats(text: string, def: number): Record<StatLabel, number> {
  const stats = {} as Record<StatLabel, number>;
  for (const s of STAT_ORDER) stats[s] = def;
  for (const chunk of text.split("/")) {
    const m = /^\s*(\d+)\s+(\w+)/.exec(chunk.trim());
    if (m) {
      const value = parseInt(m[1], 10);
      const label = m[2];
      for (const s of STAT_ORDER) if (s.toLowerCase() === label.toLowerCase()) stats[s] = value;
    }
  }
  return stats;
}

export function parsePokemon(block: string): Pokemon | null {
  const trimmed = block.trim();
  if (!trimmed) return null;
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const { nickname, species, gender, item } = parseHeader(lines[0]);
  const mon = newPokemon({ nickname, species, gender, item, lines, rawBlock: trimmed });

  for (const line of lines.slice(1)) {
    const low = line.toLowerCase();
    if (low.startsWith("ability:")) {
      mon.ability = line.slice(line.indexOf(":") + 1).trim();
    } else if (low.startsWith("level:")) {
      const n = parseInt(line.slice(line.indexOf(":") + 1).trim(), 10);
      if (!Number.isNaN(n)) mon.level = n;
    } else if (low.startsWith("shiny:")) {
      mon.shiny = line.slice(line.indexOf(":") + 1).trim().toLowerCase().startsWith("y");
    } else if (low.startsWith("tera type:")) {
      mon.teraType = line.slice(line.indexOf(":") + 1).trim();
    } else if (low.startsWith("evs:")) {
      mon.evs = parseStats(line.slice(line.indexOf(":") + 1), 0);
    } else if (low.startsWith("ivs:")) {
      mon.ivs = parseStats(line.slice(line.indexOf(":") + 1), DEFAULT_IV);
    } else if (low.endsWith("nature")) {
      mon.nature = line.slice(0, line.lastIndexOf(" ")).trim();
    } else if (line.startsWith("-")) {
      mon.moves.push(line.replace(/^-+/, "").trim());
    }
  }
  return mon;
}

export function parseTeam(text: string): Pokemon[] {
  const blocks = text.trim().split(/\n(?:\s*\n)+/);
  const team: Pokemon[] = [];
  for (const block of blocks) {
    const mon = parsePokemon(block);
    if (mon) team.push(mon);
  }
  return team;
}

export function teamToShowdown(team: Pokemon[]): string {
  return team.map(toShowdown).join("\n\n");
}

/**
 * Champions team exports put Stat Points (0–32 per stat, ≤66 total) in the EVs
 * line. Detect that shape and convert to real mainline EVs so the set is properly
 * invested and legal. Genuine EV spreads (which include values > 32) are left as-is.
 */
function looksLikeChampionsSp(evs: Record<StatLabel, number>): boolean {
  const vals = STAT_ORDER.map((s) => evs[s] ?? 0);
  const total = vals.reduce((a, b) => a + b, 0);
  return total > 0 && total <= SP_MAX_TOTAL && vals.every((v) => v <= SP_MAX_PER_STAT);
}

export function normalizeChampionsImport(team: Pokemon[]): Pokemon[] {
  return team.map((mon) =>
    looksLikeChampionsSp(mon.evs) ? syncLines({ ...mon, evs: spSpreadToEvs(mon.evs) }) : mon,
  );
}
