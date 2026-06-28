"use client";

import { useState } from "react";
import { getSpecies } from "@/lib/data";
import { spriteUrl } from "@/lib/assets";
import { spriteCandidates } from "@/lib/meta";

/**
 * Sprite for a competitive (meta) Pokémon. Tries, in order: the bundled local
 * sprite (when the name maps to a Champions species), an explicit `src` (the
 * index entry's authoritative sprite), then upstream assets under both the
 * name as-given and its form-normalized spelling. Walks the list on load error
 * so Megas / regional forms never render broken, whatever the naming.
 */
export function MetaSprite({ name, src, size = 56, className }: { name: string; src?: string; size?: number; className?: string }) {
  const local = getSpecies(name);
  const candidates = spriteCandidates(name, src, local ? spriteUrl(local.id) : undefined);

  const [idx, setIdx] = useState(0);
  // Reset to the first candidate when the Pokémon (or its candidates) changes.
  const [key, setKey] = useState(name + "|" + (src ?? ""));
  const cur = name + "|" + (src ?? "");
  if (key !== cur) { setKey(cur); setIdx(0); }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={candidates[Math.min(idx, candidates.length - 1)]}
      alt={name}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      decoding="async"
      style={{ imageRendering: "auto" }}
      onError={() => setIdx((i) => (i + 1 < candidates.length ? i + 1 : i))}
    />
  );
}
