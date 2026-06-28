// Champions Stat-Point (SP) system + Showdown-accurate stat math.
// Ported from berichan/pokedex.py — values must match the desktop app exactly.

export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
export type StatLabel = "HP" | "Atk" | "Def" | "SpA" | "SpD" | "Spe";

export const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];
export const STAT_ORDER: StatLabel[] = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
export const STAT_LABELS: Record<StatKey, StatLabel> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
};
export const LABEL_TO_KEY: Record<StatLabel, StatKey> = {
  HP: "hp", Atk: "atk", Def: "def", SpA: "spa", SpD: "spd", Spe: "spe",
};

// Champions: IVs gone (treated as 31), 66 SP total, 32 SP/stat, 1 SP = +1 @ Lv50.
export const SP_MAX_PER_STAT = 32;
export const SP_MAX_TOTAL = 66;
export const CHAMPIONS_LEVEL = 50;
export const PERFECT_IV = 31;
// Mainline games cap EVs at 510 total / 252 per stat.
export const MAINLINE_EV_TOTAL = 510;

/** Python-style round-half-to-even (banker's rounding) so ports match exactly. */
function pyRound(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1; // exactly .5 -> nearest even
}

export function spToEv(sp: number): number {
  return Math.min(Math.max(0, sp) * 8, 252);
}

export function evToSp(ev: number): number {
  return Math.min(pyRound(Math.max(0, ev) / 8), SP_MAX_PER_STAT);
}

/**
 * Convert a Champions SP spread (keyed by stat label) into legal mainline EVs:
 * each stat <= 252 and the TOTAL <= 510, trimming least-invested stats first so
 * maxed stats stay exact.
 */
export function spSpreadToEvs(sp: Partial<Record<StatLabel, number>>): Record<StatLabel, number> {
  const ev = {} as Record<StatLabel, number>;
  for (const label of STAT_ORDER) ev[label] = spToEv(sp[label] ?? 0);
  let excess = STAT_ORDER.reduce((s, l) => s + ev[l], 0) - MAINLINE_EV_TOTAL;
  if (excess > 0) {
    for (const label of [...STAT_ORDER].sort((a, b) => ev[a] - ev[b])) {
      if (excess <= 0) break;
      const take = Math.min(ev[label], excess);
      ev[label] -= take;
      excess -= take;
    }
  }
  return ev;
}

// Nature -> [boosted stat, hindered stat]; neutral natures map to [null, null].
export const NATURES: Record<string, [StatKey | null, StatKey | null]> = {
  "": [null, null], Hardy: [null, null], Docile: [null, null],
  Serious: [null, null], Bashful: [null, null], Quirky: [null, null],
  Lonely: ["atk", "def"], Brave: ["atk", "spe"], Adamant: ["atk", "spa"],
  Naughty: ["atk", "spd"], Bold: ["def", "atk"], Relaxed: ["def", "spe"],
  Impish: ["def", "spa"], Lax: ["def", "spd"], Timid: ["spe", "atk"],
  Hasty: ["spe", "def"], Jolly: ["spe", "spa"], Naive: ["spe", "spd"],
  Modest: ["spa", "atk"], Mild: ["spa", "def"], Quiet: ["spa", "spe"],
  Rash: ["spa", "spd"], Calm: ["spd", "atk"], Gentle: ["spd", "def"],
  Sassy: ["spd", "spe"], Careful: ["spd", "spa"],
};

export const NATURE_NAMES = Object.keys(NATURES);

/** Champions stat: perfect IVs, SP added linearly (== standard formula, IV 31, EV=8*SP). */
export function calcStatSp(stat: StatKey, base: number, sp: number, level: number, nature: string): number {
  const lvl = level || CHAMPIONS_LEVEL;
  const common = Math.floor(((2 * base + PERFECT_IV) * lvl) / 100);
  if (stat === "hp") {
    if (base === 1) return 1;
    return common + lvl + 10 + sp;
  }
  const [plus, minus] = NATURES[nature] ?? [null, null];
  const mod = stat === plus ? 1.1 : stat === minus ? 0.9 : 1.0;
  return Math.floor((common + 5 + sp) * mod);
}

/** baseStats keyed by StatKey, sp keyed by StatLabel; result keyed by StatKey. */
export function calcAllStatsSp(
  baseStats: Partial<Record<StatKey, number>>,
  sp: Partial<Record<StatLabel, number>>,
  level: number,
  nature: string,
): Record<StatKey, number> {
  const out = {} as Record<StatKey, number>;
  for (const key of STAT_KEYS) {
    out[key] = calcStatSp(key, baseStats[key] ?? 0, sp[STAT_LABELS[key]] ?? 0, level, nature);
  }
  return out;
}
