"use client";

import { useMemo, useState } from "react";
import { searchSpecies } from "@/lib/data";
import { spriteUrl, typeIconUrl } from "@/lib/assets";
import type { Species } from "@/lib/types";
import { Modal } from "./ui/Modal";

export function SpeciesPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (s: Species) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchSpecies(query), [query]);

  return (
    <Modal open={open} onClose={onClose} title="Choose a Pokémon" className="max-w-xl">
      <input
        autoFocus
        className="input mb-3"
        placeholder="Search the Champions roster…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {results.map((sp) => (
          <button
            key={sp.id}
            className="flex items-center gap-3 rounded-lg p-2 text-left hover:bg-[var(--panel)]"
            onClick={() => {
              onPick(sp);
              onClose();
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spriteUrl(sp.id)} alt={sp.name} width={44} height={44} className="shrink-0" />
            <div className="min-w-0">
              <div className="truncate font-medium">{sp.name}</div>
              <div className="mt-0.5 flex gap-1">
                {sp.types.map((t) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={t} src={typeIconUrl(t)} alt={t} height={14} className="h-3.5" />
                ))}
              </div>
            </div>
          </button>
        ))}
        {results.length === 0 && <div className="muted col-span-full p-4 text-sm">No matches.</div>}
      </div>
    </Modal>
  );
}
