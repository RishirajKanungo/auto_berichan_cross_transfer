"use client";

import { useMemo } from "react";
import { ShieldAlert, Swords } from "lucide-react";
import { getMove, getSpecies } from "@/lib/data";
import { typeIconUrl } from "@/lib/assets";
import { typeColor } from "@/lib/typeColors";
import {
  BUCKET_COLOR, BUCKET_LABEL, BUCKET_TEXT, defensiveTable, offensiveCoverage,
} from "@/lib/typechart";
import type { Pokemon } from "@/lib/types";
import { MetaSprite } from "./MetaSprite";

/**
 * Live defensive + offensive type analysis of the current team — the core VGC
 * "does my team cover the meta / does it stack weaknesses" check. Pure type math
 * (from @smogon/calc's chart); updates as the team is edited.
 */
export function TeamAnalysis({ team }: { team: Pokemon[] }) {
  const members = useMemo(
    () => team.map((mon) => ({ mon, types: getSpecies(mon.species)?.types ?? [] })),
    [team],
  );
  const typed = members.filter((m) => m.types.length > 0);

  const defense = useMemo(() => defensiveTable(typed.map((m) => m.types)), [typed]);

  // Offensive coverage from the team's damaging-move types (falling back to a
  // member's STAB types when it has no attacking moves yet).
  const attackTypes = useMemo(() => {
    const out = new Set<string>();
    for (const { mon, types } of typed) {
      const dmg = mon.moves
        .map((mv) => getMove(mv))
        .filter((m) => m && m.category !== "Status")
        .map((m) => m!.type);
      if (dmg.length) dmg.forEach((t) => out.add(t));
      else types.forEach((t) => out.add(t)); // assume STAB potential
    }
    return [...out];
  }, [typed]);

  const coverage = useMemo(() => offensiveCoverage(attackTypes), [attackTypes]);

  if (typed.length === 0) {
    return (
      <div className="card muted p-6 text-center text-sm">
        Add Pokémon (with a recognised species) to see your team&apos;s type analysis.
      </div>
    );
  }

  const sharedWeak = defense.filter((r) => r.danger);
  const gaps = coverage.filter((c) => !c.hits).map((c) => c.type);

  return (
    <div className="space-y-4">
      {/* Actionable summary first */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <ShieldAlert size={15} style={{ color: "#e35d4a" }} /> Shared weaknesses
          </div>
          {sharedWeak.length === 0 ? (
            <p className="muted text-xs">No type hits a majority of your team super-effectively. Nicely balanced.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sharedWeak.map((r) => (
                <span key={r.type} className="chip" style={{ borderColor: "#e35d4a" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={typeIconUrl(r.type)} alt={r.type} className="h-3.5" />
                  {r.type} <b style={{ color: "#e35d4a" }}>{r.weak}×weak</b>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <Swords size={15} style={{ color: "var(--accent)" }} /> Offensive coverage gaps
          </div>
          {gaps.length === 0 ? (
            <p className="muted text-xs">Your attacks hit every type at least neutrally — no major gaps.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <span className="muted self-center text-xs">Nothing hits these for 2×:</span>
              {gaps.map((t) => (
                <span key={t} className="chip">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={typeIconUrl(t)} alt={t} className="h-3.5" />
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Defensive matrix: attack types × members */}
      <div className="card overflow-x-auto p-3">
        <div className="mb-2 text-sm font-semibold">Defensive matrix</div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="px-1 py-1 text-left font-medium">Type</th>
              {typed.map(({ mon }, i) => (
                <th key={i} className="px-1 py-1">
                  <MetaSprite name={mon.species} size={28} className="mx-auto" />
                </th>
              ))}
              <th className="px-1 py-1 text-right font-medium">±</th>
            </tr>
          </thead>
          <tbody>
            {defense.map((row) => (
              <tr key={row.type} style={row.danger ? { outline: "1px solid #e35d4a" } : undefined}>
                <td className="whitespace-nowrap px-1 py-0.5">
                  <span className="inline-flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={typeIconUrl(row.type)} alt="" className="h-3.5" />
                    <span style={{ color: typeColor(row.type) }} className="font-semibold">{row.type}</span>
                  </span>
                </td>
                {row.cells.map((c, i) => (
                  <td key={i} className="px-0.5 py-0.5 text-center">
                    <span
                      className="inline-block w-9 rounded py-0.5 text-[10px] font-bold"
                      style={{ background: BUCKET_COLOR[c.bucket], color: BUCKET_TEXT[c.bucket] }}
                    >
                      {c.bucket === "x1" ? "" : BUCKET_LABEL[c.bucket]}
                    </span>
                  </td>
                ))}
                <td className="px-1 py-0.5 text-right tabular-nums">
                  <span style={{ color: "#e35d4a" }}>{row.weak || ""}</span>
                  {row.weak && row.resist ? <span className="muted"> / </span> : ""}
                  <span style={{ color: "#3a8f4f" }}>{row.resist || ""}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted mt-2 text-[10px]">
          Red = your Pokémon takes super-effective damage from that type; green = resists/immune. Rows outlined in red are shared weaknesses.
        </p>
      </div>
    </div>
  );
}
