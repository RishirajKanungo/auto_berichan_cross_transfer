// Damage calculator wrapper around @smogon/calc (the engine behind the Showdown
// calc), so results match Showdown exactly. We feed it our Champions sets: SP is
// converted to EVs (sp*8) with perfect IVs, giving identical Lv50 stats.

import { calculate, Field, Generations, Move, Pokemon } from "@smogon/calc";
import { STAT_KEYS, STAT_LABELS, spToEv, type StatKey, type StatLabel } from "./stats";

const gen = Generations.get(9);

export interface CalcSide {
  species: string;
  level: number;
  nature: string;
  item: string;
  ability: string;
  teraType: string;
  tera: boolean;
  status: string; // "" | "brn" | "par" | "psn" | "tox" | "slp" | "frz"
  sp: Record<StatLabel, number>;
  boosts: Partial<Record<StatKey, number>>; // atk/def/spa/spd/spe (-6..6)
  moves: string[];
}

export interface FieldConfig {
  doubles: boolean;
  weather: string; // "", "Sun", "Rain", "Sand", "Snow"
  terrain: string; // "", "Electric", "Grassy", "Misty", "Psychic"
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  helpingHand: boolean;
  crit: boolean;
}

export interface MoveResult {
  move: string;
  minDmg: number;
  maxDmg: number;
  minPct: number;
  maxPct: number;
  desc: string;
}

type PokeOpts = ConstructorParameters<typeof Pokemon>[2];
type MoveOpts = ConstructorParameters<typeof Move>[2];
type FieldOpts = ConstructorParameters<typeof Field>[0];

function buildPokemon(side: CalcSide): Pokemon {
  const evs = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) evs[k] = spToEv(side.sp[STAT_LABELS[k]] ?? 0);
  const opts = {
    level: side.level || 50,
    nature: side.nature || undefined,
    item: side.item || undefined,
    ability: side.ability || undefined,
    evs,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    boosts: side.boosts,
    status: side.status || "",
    teraType: side.tera && side.teraType ? side.teraType : undefined,
  };
  return new Pokemon(gen, side.species, opts as PokeOpts);
}

export function sideStats(side: CalcSide): Record<StatKey, number> | null {
  try {
    return buildPokemon(side).stats as Record<StatKey, number>;
  } catch {
    return null;
  }
}

export function calcMove(att: CalcSide, def: CalcSide, moveName: string, fc: FieldConfig): MoveResult | null {
  if (!moveName) return null;
  try {
    const attacker = buildPokemon(att);
    const defender = buildPokemon(def);
    const move = new Move(gen, moveName, { isCrit: fc.crit } as MoveOpts);
    const field = new Field({
      gameType: fc.doubles ? "Doubles" : "Singles",
      weather: fc.weather || undefined,
      terrain: fc.terrain || undefined,
      attackerSide: { isHelpingHand: fc.helpingHand },
      defenderSide: { isReflect: fc.reflect, isLightScreen: fc.lightScreen, isAuroraVeil: fc.auroraVeil },
    } as FieldOpts);

    const res = calculate(gen, attacker, defender, move, field);
    const [minDmg, maxDmg] = res.range();
    const hp = defender.maxHP();
    let desc = "";
    try { desc = res.desc(); } catch { desc = maxDmg === 0 ? "No effect" : ""; }
    return {
      move: moveName,
      minDmg,
      maxDmg,
      minPct: hp ? (minDmg / hp) * 100 : 0,
      maxPct: hp ? (maxDmg / hp) * 100 : 0,
      desc,
    };
  } catch {
    return null;
  }
}
