// Type-effectiveness analysis for team building. The multipliers are read from
// @smogon/calc's gen-9 type chart (the same engine the damage calc uses), so they
// always match in-game behaviour rather than a hand-maintained table.

import { Generations } from "@smogon/calc";

const gen = Generations.get(9);

/** The 18 real types, in the conventional chart order. */
export const TYPES = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison", "Ground",
  "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy",
] as const;
export type TypeName = (typeof TYPES)[number];

// gen.types.get() is keyed by lowercase id; the effectiveness map is keyed by
// capitalized type name → multiplier of `attacking` vs a single defending type.
type TypeId = Parameters<typeof gen.types.get>[0];
function pairMultiplier(attacking: string, defending: string): number {
  const t = gen.types.get(attacking.toLowerCase() as TypeId);
  const e = t?.effectiveness as Record<string, number> | undefined;
  const v = e?.[defending];
  return typeof v === "number" ? v : 1;
}

/** Damage multiplier a defender with `defTypes` takes from a single attacking type. */
export function multiplierVs(attacking: string, defTypes: string[]): number {
  return defTypes.reduce((m, dt) => m * pairMultiplier(attacking, dt), 1);
}

export type Bucket = "x4" | "x2" | "x1" | "half" | "quarter" | "x0";

export function bucketOf(mult: number): Bucket {
  if (mult === 0) return "x0";
  if (mult >= 4) return "x4";
  if (mult >= 2) return "x2";
  if (mult <= 0.25) return "quarter";
  if (mult <= 0.5) return "half";
  return "x1";
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  x4: "×4", x2: "×2", x1: "×1", half: "×½", quarter: "×¼", x0: "×0",
};
export const BUCKET_COLOR: Record<Bucket, string> = {
  x4: "#b71c1c", x2: "#e35d4a", x1: "transparent", half: "#3a8f4f", quarter: "#1f6b39", x0: "#444",
};
/** Text color so cell contents stay legible on the bucket background. */
export const BUCKET_TEXT: Record<Bucket, string> = {
  x4: "#fff", x2: "#fff", x1: "var(--muted)", half: "#fff", quarter: "#fff", x0: "#fff",
};

export interface DefenseRow {
  type: TypeName;
  cells: { mult: number; bucket: Bucket }[]; // one per team member
  weak: number;   // members taking >1x
  resist: number; // members taking <1x (incl. immune)
  /** A shared weakness: several members weak and (almost) nobody resists it. */
  danger: boolean;
}

/** Per-attacking-type defensive profile for a team, sorted worst-first. */
export function defensiveTable(memberTypes: string[][]): DefenseRow[] {
  const rows = TYPES.map((type) => {
    const cells = memberTypes.map((dt) => {
      const mult = multiplierVs(type, dt);
      return { mult, bucket: bucketOf(mult) };
    });
    const weak = cells.filter((c) => c.mult > 1).length;
    const resist = cells.filter((c) => c.mult < 1).length;
    // Dangerous when at least a third of the team is weak and resists don't offset it.
    const danger = memberTypes.length > 0 && weak >= Math.max(2, Math.ceil(memberTypes.length / 2)) && weak > resist;
    return { type, cells, weak, resist, danger };
  });
  return rows.sort((a, b) => b.weak - a.weak || a.resist - b.resist || TYPES.indexOf(a.type) - TYPES.indexOf(b.type));
}

/** Offensive coverage: which defending types the given attacking types hit for ≥2×. */
export function offensiveCoverage(attackingTypes: string[]): { type: TypeName; hits: boolean }[] {
  const atk = [...new Set(attackingTypes)];
  return TYPES.map((def) => ({
    type: def,
    hits: atk.some((a) => pairMultiplier(a, def) >= 2),
  }));
}
