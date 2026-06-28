"use client";

import { useEffect, useState } from "react";
import { Gauge, Swords } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SpeedTiersTable } from "@/components/speed/SpeedTiersTable";
import { TurnSimulator } from "@/components/speed/TurnSimulator";
import { getMetaIndex, getUsageRanks, type MetaFormat, type MetaIndexEntry } from "@/lib/meta";

type Tab = "tiers" | "sim";

export default function SpeedPage() {
  const [entries, setEntries] = useState<MetaIndexEntry[] | null>(null);
  const [ranksByFormat, setRanksByFormat] = useState<Record<MetaFormat, Map<string, number> | undefined>>(
    {} as Record<MetaFormat, Map<string, number> | undefined>,
  );
  const [format, setFormat] = useState<MetaFormat>("Doubles");
  const [tab, setTab] = useState<Tab>("tiers");

  useEffect(() => { getMetaIndex().then(setEntries); }, []);
  useEffect(() => {
    let active = true;
    getUsageRanks(format).then((m) => { if (active) setRanksByFormat((prev) => ({ ...prev, [format]: m })); });
    return () => { active = false; };
  }, [format]);

  const ranks = ranksByFormat[format] ?? null;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Speed Tiers</h1>
            <p className="muted text-sm">Pokémon Champions · {format} · who moves first, at a glance</p>
          </div>
          <div className="ml-auto flex gap-1">
            {(["Doubles", "Singles"] as const).map((f) => (
              <button key={f} className="btn" onClick={() => setFormat(f)}
                style={format === f ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "transparent" } : undefined}>
                {f}
              </button>
            ))}
          </div>
        </header>

        <div className="mb-4 flex gap-1">
          <button className="btn" onClick={() => setTab("tiers")}
            style={tab === "tiers" ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "transparent" } : undefined}>
            <Gauge size={15} /> Speed tier table
          </button>
          <button className="btn" onClick={() => setTab("sim")}
            style={tab === "sim" ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "transparent" } : undefined}>
            <Swords size={15} /> Turn simulator
          </button>
        </div>

        {entries === null ? (
          <div className="card muted p-10 text-center">Loading the roster…</div>
        ) : tab === "tiers" ? (
          <SpeedTiersTable entries={entries} format={format} ranks={ranks} />
        ) : (
          <TurnSimulator entries={entries} />
        )}
      </div>
    </AppShell>
  );
}
