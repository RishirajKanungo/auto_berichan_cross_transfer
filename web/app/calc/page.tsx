"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SidePanel } from "@/components/calc/SidePanel";
import { Combobox } from "@/components/ui/Combobox";
import { Modal } from "@/components/ui/Modal";
import { getSpecies } from "@/lib/data";
import { calcMove, type CalcSide, type FieldConfig } from "@/lib/calc";
import { evToSp, STAT_ORDER, type StatLabel } from "@/lib/stats";
import { normalizeChampionsImport, parseTeam } from "@/lib/teamParser";

function emptySp(): Record<StatLabel, number> {
  return { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
}
function newSide(species: string): CalcSide {
  return {
    species, level: 50, nature: "", item: "", ability: getSpecies(species)?.abilities[0] ?? "",
    teraType: "", tera: false, status: "", sp: emptySp(), boosts: {}, moves: [],
  };
}

const DEFAULT_FIELD: FieldConfig = {
  doubles: true, weather: "", terrain: "", reflect: false, lightScreen: false,
  auroraVeil: false, helpingHand: false, crit: false,
};

export default function CalcPage() {
  const [attacker, setAttacker] = useState<CalcSide>(() => newSide("Garchomp"));
  const [defender, setDefender] = useState<CalcSide>(() => newSide("Garchomp"));
  const [field, setField] = useState<FieldConfig>(DEFAULT_FIELD);
  const [importFor, setImportFor] = useState<null | "att" | "def">(null);
  const [importText, setImportText] = useState("");

  const attSpecies = getSpecies(attacker.species);
  const movepool = attSpecies?.moves ?? [];

  const results = useMemo(
    () => attacker.moves.map((mv) => (mv ? calcMove(attacker, defender, mv, field) : null)),
    [attacker, defender, field],
  );

  const setMove = (slot: number, v: string) =>
    setAttacker((a) => {
      const moves = [...a.moves];
      moves[slot] = v;
      return { ...a, moves };
    });

  const swap = () => { setAttacker(defender); setDefender(attacker); };

  const doImport = () => {
    const parsed = normalizeChampionsImport(parseTeam(importText));
    if (!parsed.length) return;
    const m = parsed[0];
    const side: CalcSide = {
      species: m.species, level: m.level || 50, nature: m.nature,
      item: m.item, ability: m.ability || getSpecies(m.species)?.abilities[0] || "",
      teraType: m.teraType, tera: !!m.teraType, status: "",
      sp: Object.fromEntries(STAT_ORDER.map((l) => [l, evToSp(m.evs[l] ?? 0)])) as Record<StatLabel, number>,
      boosts: {}, moves: m.moves,
    };
    if (importFor === "att") setAttacker(side);
    else setDefender(side);
    setImportText("");
    setImportFor(null);
  };

  const fieldBtn = (on: boolean) =>
    on ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "transparent" } : undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Damage Calculator</h1>
          <span className="muted text-xs">Champions · matches the Showdown calc</span>
          <button className="btn ml-auto" onClick={swap}><ArrowLeftRight size={15} /> Swap</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SidePanel label="Attacker" side={attacker} onChange={(p) => setAttacker((a) => ({ ...a, ...p }))} onImport={() => setImportFor("att")} />
          <SidePanel label="Defender" side={defender} onChange={(p) => setDefender((d) => ({ ...d, ...p }))} onImport={() => setImportFor("def")} />
        </div>

        {/* Field */}
        <div className="card mt-4 flex flex-wrap items-center gap-2 p-3 text-sm">
          <select className="input w-auto py-1" value={field.weather} onChange={(e) => setField((f) => ({ ...f, weather: e.target.value }))}>
            <option value="">No weather</option><option>Sun</option><option>Rain</option><option>Sand</option><option>Snow</option>
          </select>
          <select className="input w-auto py-1" value={field.terrain} onChange={(e) => setField((f) => ({ ...f, terrain: e.target.value }))}>
            <option value="">No terrain</option><option>Electric</option><option>Grassy</option><option>Misty</option><option>Psychic</option>
          </select>
          {([["doubles", "Doubles"], ["reflect", "Reflect"], ["lightScreen", "Light Screen"], ["auroraVeil", "Aurora Veil"], ["helpingHand", "Helping Hand"], ["crit", "Crit"]] as [keyof FieldConfig, string][]).map(([k, lbl]) => (
            <button key={k} className="btn" style={fieldBtn(!!field[k])} onClick={() => setField((f) => ({ ...f, [k]: !f[k] }))}>{lbl}</button>
          ))}
        </div>

        {/* Moves + results */}
        <div className="mt-4 space-y-2">
          <div className="muted text-sm font-semibold">{attacker.species}&apos;s moves vs {defender.species}</div>
          {[0, 1, 2, 3].map((slot) => {
            const r = results[slot];
            const ko = r?.desc.split("--")[1]?.trim();
            return (
              <div key={slot} className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <div className="sm:w-56">
                  <Combobox value={attacker.moves[slot] ?? ""} onChange={(v) => setMove(slot, v)} options={movepool} placeholder={`Move ${slot + 1}`} />
                </div>
                {r ? (
                  <div className="flex-1">
                    <div className="font-semibold">
                      {r.maxDmg === 0 ? (
                        <span className="muted">No effect</span>
                      ) : (
                        <>
                          {r.minPct.toFixed(1)}% – {r.maxPct.toFixed(1)}%
                          <span className="muted font-normal"> ({r.minDmg}–{r.maxDmg} dmg)</span>
                        </>
                      )}
                    </div>
                    {ko && <div className="text-xs" style={{ color: "#f1c40f" }}>{ko}</div>}
                  </div>
                ) : (
                  <div className="muted flex-1 text-sm">—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={importFor !== null}
        onClose={() => setImportFor(null)}
        title={`Import ${importFor === "att" ? "attacker" : "defender"} from Showdown`}
        footer={<><button className="btn" onClick={() => setImportFor(null)}>Cancel</button><button className="btn btn-primary" onClick={doImport}>Import</button></>}
      >
        <textarea className="input h-48 font-mono text-xs" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste a Showdown set…" />
      </Modal>
    </AppShell>
  );
}
