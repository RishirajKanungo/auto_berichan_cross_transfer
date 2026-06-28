"use client";

import { useState } from "react";
import { getSpecies } from "@/lib/data";
import { spriteUrl } from "@/lib/assets";
import { remoteSpriteUrl } from "@/lib/meta";

/**
 * Sprite for a competitive (meta) Pokémon. Prefers the bundled local sprite when
 * the name maps to a Champions species; otherwise (Megas and other forms) uses
 * the authoritative upstream asset — pass `src` (the index entry's sprite URL)
 * for guaranteed-correct form sprites, else it falls back to a name-derived URL.
 * Swaps to the fallback on load error so nothing ever renders broken.
 */
export function MetaSprite({ name, src, size = 56, className }: { name: string; src?: string; size?: number; className?: string }) {
  const local = getSpecies(name);
  const fallback = src || remoteSpriteUrl(name);
  const [current, setCurrent] = useState(local ? spriteUrl(local.id) : fallback);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "auto" }}
      onError={() => { if (current !== fallback) setCurrent(fallback); }}
    />
  );
}
