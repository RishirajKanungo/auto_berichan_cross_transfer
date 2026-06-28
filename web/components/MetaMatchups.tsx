"use client";

import { useEffect, useMemo, useState } from "react";
import { Swords, Shield } from "lucide-react";
import { MetaSprite } from "./MetaSprite";
import { displayName } from "@/lib/teamParser";
import { getMeta, getMetaIndex, getUsageRanks, normalizeMonName, type MetaFormat, type MetaIndexEntry } from "@/lib/meta";
import { bestHit, koLabel, koSeverity, metaToCalcSide, pokemonToCalcSide, type Hit } from "@/lib/matchups";
import type { CalcSide, FieldConfig } from "@/lib/calc";
import type { Pokemon } from "@/lib/types";

const THREAT_COUNT = 15;

interface Threat { entry: MetaIndexEntry; side: CalcSide }

const field = (doubles: boolean): FieldConfig => ({
  doubles, weather: "", terrain: "", reflect: false, lightScreen: false,
  auroraVeil: false, helpingHand: false, crit: false,
});

// Green when YOU score the KO (offence), red when the threat KOs you (defence).
function chipStyle(sev: number, offence: boolean): React.CSSProperties {
  if (sev < 0) return { background: "var(--panel)", color: "var(--muted)" };
  const good = ["#2f6b3f", "#3a8f4f", "#4caf50", "#2e7d32"];
  const bad = ["#7a3b34", "#b5503f", "#d4503a", "#b71c1c"];
  return { background: (offence ? good : bad)[sev], color: "#fff" };
}

export function MetaMatchups({ team }: { team: Pokemon[] }) {
  const [format, setFormat] = useState<MetaFormat>("Doubles");
  const [loaded, setLoaded] = useState<{ format: MetaFormat; threats: Threat[] } | null>(null);
  const [focus, setFocus] = useState(0);

  // Load the top-usage threats' most-used sets for the chosen format.
  useEffect(() => {
    let active = true;
    (async () => {
      const [index, ranks] = await Promise.all([getMetaIndex(), getUsageRanks(format)]);
      const top = index
        .filter((e) => !e.form && e.formats.includes(format))
        .map((e) => ({ e, rank: ranks.get(normalizeMonName(e.name)) ?? Infinity }))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, THREAT_COUNT);
      const metas = await Promise.all(top.map(({ e }) => getMeta(e.name, format)));
      if (!active) return;
      setLoaded({ format, threats: top.map(({ e }, i) => ({ entry: e, side: metaToCalcSide(e, metas[i]) })) });
    })();
    return () => { active = false; };
  }, [format]);

  const threats = loaded && loaded.format === format ? loaded.threats : null;

  const fc = field(format === "Doubles");
  const me = team[focus] ? pokemonToCalcSide(team[focus]) : null;

  const rows = useMemo(() => {
    if (!me || !threats) return [];
    return threats.map((t) => {
      const deal = bestHit(me, t.side, fc);   // you → threat
      const take = bestHit(t.side, me, fc);   // threat → you
      return { threat: t, deal, take };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, threats, format]);

  if (team.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["Doubles", "Singles"] as const).map((f) => (
            <button key={f} className="btn" onClick={() => setFormat(f)}
              style={format === f ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "transparent" } : undefined}>
              {f}
            </button>
          ))}
        </div>
        <span className="muted text-xs">Pick one of your Pokémon, see how it fares vs the top {THREAT_COUNT} threats — both ways.</span>
      </div>

      {/* Focused team member selector */}
      <div className="flex flex-wrap gap-1.5">
        {team.map((mon, i) => (
          <button key={i} className="rounded-lg border p-1 transition-colors"
            onClick={() => setFocus(i)}
            title={displayName(mon)}
            style={{ borderColor: focus === i ? "var(--accent)" : "var(--border)", background: focus === i ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent" }}>
            <MetaSprite name={mon.species} size={40} />
          </button>
        ))}
      </div>

      {!threats ? (
        <div className="card muted p-8 text-center text-sm">Loading the meta&apos;s most-used sets…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b" style={{ borderColor: "var(--border)" }}>
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Threat</th>
                <th className="px-3 py-2 text-left font-semibold"><span className="inline-flex items-center gap-1"><Swords size={13} style={{ color: "#3a8f4f" }} /> You deal</span></th>
                <th className="px-3 py-2 text-left font-semibold"><span className="inline-flex items-center gap-1"><Shield size={13} style={{ color: "#d4503a" }} /> You take</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ threat, deal, take }, i) => (
                <tr key={threat.entry.slug} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="muted w-5 text-right text-[10px] tabular-nums">{i + 1}</span>
                      <MetaSprite name={threat.entry.name} src={threat.entry.sprite} size={32} className="shrink-0" />
                      <span className="truncate font-medium">{threat.entry.name}</span>
                    </div>
                  </td>
                  <MatchCell hit={deal} offence />
                  <MatchCell hit={take} offence={false} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted text-[10px]">
        Damage uses each threat&apos;s most-used set vs your exact build, via the same engine as the calc. KO counts ignore residual (Leftovers, etc.); use the full calc for precise rolls.
      </p>
    </div>
  );
}

function MatchCell({ hit, offence }: { hit: Hit | null; offence: boolean }) {
  const sev = koSeverity(hit);
  return (
    <td className="px-3 py-1.5">
      {!hit ? (
        <span className="muted text-xs">—</span>
      ) : (
        <div className="flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={chipStyle(sev, offence)}>{koLabel(hit)}</span>
          <span className="tabular-nums text-xs">{Math.round(hit.maxPct)}%</span>
          <span className="muted hidden truncate text-[10px] sm:inline">{hit.move}</span>
        </div>
      )}
    </td>
  );
}
