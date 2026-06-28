// Validates that our damage engine (@smogon/calc — the same library behind the
// Pokémon Showdown calc) produces gen-9-correct rolls. Run: node scripts/check-calc.mjs
import { calculate, Generations, Move, Pokemon } from "@smogon/calc";

const gen = Generations.get(9);
let failures = 0;
const ok = (label, cond) => { console.log(`${cond ? "PASS" : "FAIL"}: ${label}`); if (!cond) failures++; };

// 1. No-modifier neutral hit must equal the textbook gen-9 formula.
const a = new Pokemon(gen, "Pikachu", { level: 50, nature: "Hardy" });
const d = new Pokemon(gen, "Pikachu", { level: 50, nature: "Hardy" });
const mv = new Move(gen, "Tackle"); // Normal, neutral on Electric
const res = calculate(gen, a, d, mv);
const base = Math.floor(Math.floor(Math.floor((2 * 50) / 5 + 2) * mv.bp * a.stats.atk / d.stats.def) / 50) + 2;
const [mn, mx] = res.range();
ok(`Pikachu Tackle rolls == formula [${Math.floor(base * 0.85)},${base}] (got [${mn},${mx}])`,
   mn === Math.floor(base * 0.85) && mx === base);

// 2. Type immunity → 0 damage.
const lando = new Pokemon(gen, "Landorus-Therian", { level: 50 });
ok("Earthquake vs Flying = 0", calculate(gen, a, lando, new Move(gen, "Earthquake")).range()[1] === 0);

// 3. Super-effective > neutral (same attacker/move, different defender type).
const water = new Pokemon(gen, "Blastoise", { level: 50, nature: "Bold", evs: { hp: 252, def: 252 } });
const fire = new Pokemon(gen, "Charizard", { level: 50, nature: "Bold", evs: { hp: 252, def: 252 } });
const surf = new Move(gen, "Surf");
const att = new Pokemon(gen, "Greninja", { level: 50, nature: "Modest", evs: { spa: 252 } });
ok("Surf does more to Charizard (SE) than Blastoise (resist)",
   calculate(gen, att, fire, surf).range()[1] > calculate(gen, att, water, surf).range()[1]);

console.log(failures ? `\n${failures} FAILED` : "\nAll calc checks passed.");
process.exit(failures ? 1 : 0);
