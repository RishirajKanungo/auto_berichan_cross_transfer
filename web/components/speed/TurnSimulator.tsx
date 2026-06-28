"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Minus, Plus, Target } from "lucide-react";
import { MetaSprite } from "@/components/MetaSprite";
import { Combobox } from "@/components/ui/Combobox";
import { allMoveNames, getMove } from "@/lib/data";
import {
  ABILITIES, ABILITY, effectivePriority, effectiveSpeed, ITEM, ITEMS, REDIRECTION_MOVES,
  type Combatant, type MoveLite, type NatureDir, type Terrain, type Weather,
} from "@/lib/speed";
import type { MetaIndexEntry } from "@/lib/meta";

interface Slot extends Combatant {
  name: string;
  side: 0 | 1;
  move: string;
}

const SIDE_LABEL = ["Your side", "Opponent"];
const SIDE_COLOR = ["#2980ef", "#e62829"];

function blankSlot(side: 0 | 1): Slot {
  return { name: "", move: "", base: 0, sp: 32, dir: "neutral", item: "none", tailwind: false, paralyzed: false, booster: false, ability: "none", stage: 0, side };
}

const WEATHERS: { id: Weather; label: string }[] = [
  { id: "none", label: "No weather" }, { id: "sun", label: "Sun" }, { id: "rain", label: "Rain" },
  { id: "sand", label: "Sandstorm" }, { id: "snow", label: "Snow" },
];
const TERRAINS: { id: Terrain; label: string }[] = [
  { id: "none", label: "No terrain" }, { id: "grassy", label: "Grassy" }, { id: "electric", label: "Electric" },
  { id: "psychic", label: "Psychic" }, { id: "misty", label: "Misty" },
];

const moveLite = (name: string): MoveLite | null => {
  const m = getMove(name);
  return m ? { name: m.name, type: m.type, category: m.category, priority: m.priority, flags: m.flags } : null;
};
const priLabel = (p: number) => (p > 0 ? `+${p}` : `${p}`);

export function TurnSimulator({ entries }: { entries: MetaIndexEntry[] }) {
  const [slots, setSlots] = useState<Slot[]>([blankSlot(0), blankSlot(0), blankSlot(1), blankSlot(1)]);
  const [trickRoom, setTrickRoom] = useState(false);
  const [weather, setWeather] = useState<Weather>("none");
  const [terrain, setTerrain] = useState<Terrain>("none");

  const names = useMemo(() => entries.map((e) => e.name).sort(), [entries]);
  const moveNames = useMemo(() => allMoveNames(), []);
  const update = (i: number, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const pick = (i: number, name: string) => {
    const e = entries.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    update(i, { name, base: e ? e.stats[5] : 0 });
  };

  // Resolve turn order: priority bracket first (Trick Room does NOT reverse
  // priority), then "moves last" effects, then Speed (TR reverses Speed only).
  const order = useMemo(() => {
    const active = slots
      .map((s, idx) => {
        const mv = moveLite(s.move);
        const prio = effectivePriority(mv, s.ability, terrain);
        const last = ABILITY(s.ability).orderLast || ITEM(s.item).orderLast || false;
        return { idx, slot: s, move: mv, prio, last, speed: effectiveSpeed(s, weather) };
      })
      .filter((x) => x.slot.name && x.slot.base > 0);

    active.sort((a, b) =>
      a.prio !== b.prio ? b.prio - a.prio
      : a.last !== b.last ? (a.last ? 1 : -1)
      : trickRoom ? a.speed - b.speed : b.speed - a.speed,
    );

    const sig = (x: typeof active[number]) => `${x.prio}|${x.last}|${x.speed}`;
    return active.map((x) => {
      const first = active.findIndex((y) => sig(y) === sig(x));
      return { ...x, pos: first + 1, tie: active.filter((y) => sig(y) === sig(x)).length > 1 };
    });
  }, [slots, trickRoom, weather, terrain]);

  return (
    <div>
      {/* Field controls */}
      <div className="card mb-3 flex flex-wrap items-center gap-3 p-3">
        <button className="btn" onClick={() => setTrickRoom((v) => !v)}
          style={trickRoom ? { background: "#704170", color: "#fff", borderColor: "transparent" } : undefined}>
          {trickRoom ? <ArrowUpWideNarrow size={15} /> : <ArrowDownWideNarrow size={15} />} Trick Room {trickRoom ? "ON" : "OFF"}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <span className="muted">Weather</span>
          <select className="input w-auto py-1" value={weather} onChange={(e) => setWeather(e.target.value as Weather)}>
            {WEATHERS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="muted">Terrain</span>
          <select className="input w-auto py-1" value={terrain} onChange={(e) => setTerrain(e.target.value as Terrain)}>
            {TERRAINS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <span className="muted ml-auto text-xs">
          Order = priority bracket → {trickRoom ? "slowest" : "fastest"} Speed · ties are 50/50
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-2 sm:grid-cols-2">
          {slots.map((s, i) => (
            <SlotCard key={i} slot={s} names={names} moveNames={moveNames} terrain={terrain}
              speed={effectiveSpeed(s, weather)} onPick={(n) => pick(i, n)} onUpdate={(p) => update(i, p)} />
          ))}
        </div>

        {/* Resolved order */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <div className="card p-3">
            <div className="mb-2 text-sm font-semibold">Turn order</div>
            {order.length === 0 ? (
              <p className="muted text-sm">Add Pokémon (and optionally their moves) to see who acts first.</p>
            ) : (
              <ol className="space-y-1.5">
                {order.map((x) => {
                  const redirect = REDIRECTION_MOVES.has(x.slot.move);
                  const psyBlocked = terrain === "psychic" && x.move && x.prio > 0 && x.move.category !== "Status";
                  return (
                    <li key={x.idx} className="rounded-lg p-1.5" style={{ background: "var(--panel)" }}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 text-center text-lg font-black tabular-nums" style={{ color: x.tie ? "var(--muted)" : "var(--accent)" }}>
                          {x.tie ? "=" : x.pos}
                        </span>
                        <MetaSprite name={x.slot.name} size={36} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{x.slot.name}</span>
                            {x.prio !== 0 && (
                              <span className="rounded px-1 text-[9px] font-bold" style={{ background: x.prio > 0 ? "#3fa129" : "#9141cb", color: "#fff" }}>
                                {priLabel(x.prio)} prio
                              </span>
                            )}
                          </div>
                          <div className="text-[10px]" style={{ color: SIDE_COLOR[x.slot.side] }}>
                            {SIDE_LABEL[x.slot.side]}{x.slot.move ? ` · ${x.slot.move}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold tabular-nums">{x.speed}</div>
                          {x.tie && <div className="muted text-[9px]">speed tie</div>}
                        </div>
                      </div>
                      {(redirect || psyBlocked) && (
                        <div className="mt-1 space-y-0.5 pl-8">
                          {redirect && <div className="flex items-center gap-1 text-[10px]" style={{ color: "#e67e22" }}><Target size={11} /> Redirects foes&apos; single-target moves to it</div>}
                          {psyBlocked && <div className="text-[10px]" style={{ color: "#9141cb" }}>⚠ Priority blocked vs grounded foes (Psychic Terrain)</div>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="muted mt-2 text-[10px] leading-snug">
              Priority brackets always resolve before Speed; Trick Room only flips the Speed order <i>within</i> a bracket.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotCard({
  slot, names, moveNames, terrain, speed, onPick, onUpdate,
}: {
  slot: Slot;
  names: string[];
  moveNames: string[];
  terrain: Terrain;
  speed: number;
  onPick: (name: string) => void;
  onUpdate: (patch: Partial<Slot>) => void;
}) {
  const active = !!slot.name && slot.base > 0;
  const mv = moveLite(slot.move);
  const prio = effectivePriority(mv, slot.ability, terrain);
  const abNote = ABILITY(slot.ability).note;
  const itNote = ITEM(slot.item).note;

  return (
    <div className="card p-2.5" style={{ borderColor: active ? SIDE_COLOR[slot.side] : "var(--border)" }}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase" style={{ color: SIDE_COLOR[slot.side] }}>{SIDE_LABEL[slot.side]}</span>
        <button className="muted ml-auto text-[10px] underline" onClick={() => onUpdate({ side: slot.side === 0 ? 1 : 0 })}>switch side</button>
      </div>
      <div className="flex items-center gap-2">
        {active && <MetaSprite name={slot.name} size={40} className="shrink-0" />}
        <div className="flex-1"><Combobox value={slot.name} onChange={onPick} options={names} placeholder="Pick Pokémon" /></div>
        {active && <div className="text-right"><div className="text-lg font-black tabular-nums leading-none">{speed}</div><div className="muted text-[9px]">Spe</div></div>}
      </div>

      {active && (
        <div className="mt-2 space-y-2">
          {/* Move + its priority bracket */}
          <div className="flex items-center gap-2">
            <div className="flex-1"><Combobox value={slot.move} onChange={(v) => onUpdate({ move: v })} options={moveNames} placeholder="Move (optional)" /></div>
            {mv && (
              <span className="rounded px-1.5 py-1 text-[10px] font-bold tabular-nums" style={{ background: prio > 0 ? "#3fa129" : prio < 0 ? "#9141cb" : "var(--panel)", color: prio !== 0 ? "#fff" : "var(--muted)" }}>
                {priLabel(prio)} prio
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {([["plus", "+"], ["neutral", "0"], ["minus", "−"]] as const).map(([d, sym]) => (
                <button key={d} className="btn px-2.5 py-1 text-xs" onClick={() => onUpdate({ dir: d as NatureDir })}
                  style={slot.dir === d ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "transparent" } : undefined}>{sym}</button>
              ))}
            </div>
            <div className="flex flex-1 items-center gap-1.5">
              <span className="muted text-[10px]">SP</span>
              <input type="range" min={0} max={32} value={slot.sp} onChange={(e) => onUpdate({ sp: Number(e.target.value) })} className="flex-1" style={{ accentColor: "var(--accent)" }} />
              <span className="w-5 text-right text-[10px] tabular-nums">{slot.sp}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select className="input py-1 text-xs" value={slot.ability} onChange={(e) => onUpdate({ ability: e.target.value })}>
              {ABILITIES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <select className="input py-1 text-xs" value={slot.item} onChange={(e) => onUpdate({ item: e.target.value })}>
              {ITEMS.map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Toggle on={slot.tailwind} onClick={() => onUpdate({ tailwind: !slot.tailwind })}>Tailwind</Toggle>
            <Toggle on={slot.booster} onClick={() => onUpdate({ booster: !slot.booster })}>Booster</Toggle>
            <Toggle on={slot.paralyzed} onClick={() => onUpdate({ paralyzed: !slot.paralyzed })}>Para</Toggle>
            <div className="ml-auto flex items-center gap-1">
              <span className="muted text-[10px]">Stage</span>
              <button className="btn btn-icon" onClick={() => onUpdate({ stage: Math.max(-6, slot.stage - 1) })} aria-label="Lower"><Minus size={12} /></button>
              <span className="w-7 text-center text-xs tabular-nums">{slot.stage > 0 ? `+${slot.stage}` : slot.stage}</span>
              <button className="btn btn-icon" onClick={() => onUpdate({ stage: Math.min(6, slot.stage + 1) })} aria-label="Raise"><Plus size={12} /></button>
            </div>
          </div>

          {(abNote || itNote) && (
            <div className="muted space-y-0.5 text-[10px] leading-snug">
              {abNote && <div>· {abNote}</div>}
              {itNote && <div>· {itNote}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors" onClick={onClick}
      style={{ borderColor: on ? "var(--accent)" : "var(--border)", background: on ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "transparent", color: on ? "var(--text)" : "var(--muted)" }}>
      {children}
    </button>
  );
}
