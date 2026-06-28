"use client";

import { useState } from "react";
import { allItems, getSpecies } from "@/lib/data";
import { spriteUrl, typeIconUrl } from "@/lib/assets";
import {
  LABEL_TO_KEY, NATURE_NAMES, STAT_LABELS, STAT_ORDER, type StatKey,
} from "@/lib/stats";
import { sideStats, type CalcSide } from "@/lib/calc";
import { Combobox } from "../ui/Combobox";
import { SpeciesPicker } from "../SpeciesPicker";

const TYPES = ["Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy","Stellar"];
const STATUSES: [string, string][] = [["", "Healthy"], ["brn", "Burned"], ["par", "Paralyzed"], ["psn", "Poisoned"], ["tox", "Badly Poisoned"], ["slp", "Asleep"], ["frz", "Frozen"]];
const BOOST_STATS: StatKey[] = ["atk", "def", "spa", "spd", "spe"];

export function SidePanel({
  label, side, onChange, onImport,
}: {
  label: string;
  side: CalcSide;
  onChange: (p: Partial<CalcSide>) => void;
  onImport: () => void;
}) {
  const [pick, setPick] = useState(false);
  const sp = getSpecies(side.species);
  const stats = sideStats(side);
  const itemNames = allItems().map((i) => i.name);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-3">
        {sp && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={spriteUrl(sp.id)} alt={side.species} width={56} height={56} />
        )}
        <div className="min-w-0 flex-1">
          <div className="muted text-xs">{label}</div>
          <div className="truncate font-bold">{side.species || "—"}</div>
          {sp && (
            <div className="mt-0.5 flex gap-1">
              {sp.types.map((t) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={t} src={typeIconUrl(t)} alt={t} className="h-3.5" />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button className="btn" onClick={() => setPick(true)}>Change</button>
          <button className="btn text-xs" onClick={onImport}>Import set</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Nature">
          <select className="input" value={side.nature} onChange={(e) => onChange({ nature: e.target.value })}>
            {NATURE_NAMES.map((n) => <option key={n || "x"} value={n}>{n || "—"}</option>)}
          </select>
        </Field>
        <Field label="Level"><input type="number" className="input" value={side.level} onChange={(e) => onChange({ level: Number(e.target.value) || 50 })} /></Field>
        <Field label="Item"><Combobox value={side.item} onChange={(v) => onChange({ item: v })} options={itemNames} placeholder="Item" /></Field>
        <Field label="Ability"><Combobox value={side.ability} onChange={(v) => onChange({ ability: v })} options={sp?.abilities ?? []} placeholder="Ability" /></Field>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={side.tera} onChange={(e) => onChange({ tera: e.target.checked })} style={{ accentColor: "var(--accent)" }} /> Tera
        </label>
        {side.tera && <div className="w-28"><Combobox value={side.teraType} onChange={(v) => onChange({ teraType: v })} options={TYPES} placeholder="Type" /></div>}
        <select className="input w-auto py-1 text-xs" value={side.status} onChange={(e) => onChange({ status: e.target.value })}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="muted mt-3 mb-1 text-[10px]">Stat Points (32/stat) · computed stat below</div>
      <div className="grid grid-cols-6 gap-1 text-center">
        {STAT_ORDER.map((lbl) => (
          <div key={lbl}>
            <div className="muted text-[10px]">{lbl}</div>
            <input
              type="number" min={0} max={32}
              className="input px-1 py-1 text-center text-xs"
              value={side.sp[lbl] ?? 0}
              onChange={(e) => onChange({ sp: { ...side.sp, [lbl]: Math.max(0, Math.min(32, Number(e.target.value) || 0)) } })}
            />
            <div className="text-xs font-semibold">{stats ? stats[LABEL_TO_KEY[lbl]] : "—"}</div>
          </div>
        ))}
      </div>

      <div className="muted mt-2 mb-1 text-[10px]">Boosts</div>
      <div className="grid grid-cols-5 gap-1 text-center">
        {BOOST_STATS.map((k) => (
          <div key={k}>
            <div className="muted text-[10px]">{STAT_LABELS[k]}</div>
            <select
              className="input px-0 py-1 text-center text-xs"
              value={side.boosts[k] ?? 0}
              onChange={(e) => onChange({ boosts: { ...side.boosts, [k]: Number(e.target.value) } })}
            >
              {[6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6].map((b) => <option key={b} value={b}>{b > 0 ? `+${b}` : b}</option>)}
            </select>
          </div>
        ))}
      </div>

      <SpeciesPicker open={pick} onClose={() => setPick(false)} onPick={(s) => onChange({ species: s.name, ability: s.abilities[0] ?? "", moves: [] })} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="muted mb-0.5 block text-[10px]">{label}</span>
      {children}
    </label>
  );
}
