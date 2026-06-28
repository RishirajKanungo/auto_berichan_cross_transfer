"use client";

import { ArrowDown, ArrowUp, Pencil, X } from "lucide-react";
import { getMove, itemIconUrl } from "@/lib/data";
import { typeIconUrl } from "@/lib/assets";
import { displayName } from "@/lib/teamParser";
import type { Pokemon } from "@/lib/types";
import { MetaSprite } from "./MetaSprite";

export function PokemonCard({
  mon, index, total, onEdit, onRemove, onMoveUp, onMoveDown,
}: {
  mon: Pokemon;
  index: number;
  total: number;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const itemIcon = mon.item ? itemIconUrl(mon.item) : null;
  const meta = [mon.item && `@ ${mon.item}`, mon.ability, mon.teraType && `Tera ${mon.teraType}`, mon.nature]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="card flex items-center gap-3 p-3">
      <span className="w-5 text-center text-lg font-bold accent-text">{index + 1}</span>

      <div className="relative shrink-0">
        <MetaSprite name={mon.species} size={56} />
        {itemIcon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={itemIcon} alt={mon.item} title={mon.item} width={24} height={24}
               className="absolute -bottom-1 -right-1" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{displayName(mon) || "(unnamed)"}</div>
        <div className="muted truncate text-xs">{meta || "no details"}</div>
        {mon.moves.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {mon.moves.map((mv, i) => {
              const m = getMove(mv);
              return (
                <span key={i} className="flex items-center gap-1 text-xs" title={mv}>
                  {m?.type && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={typeIconUrl(m.type)} alt={m.type} className="h-3" />
                  )}
                  <span className="muted">{mv}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button className="btn btn-icon" onClick={onMoveUp} disabled={index === 0} aria-label="Move up"><ArrowUp size={15} /></button>
        <button className="btn btn-icon" onClick={onMoveDown} disabled={index === total - 1} aria-label="Move down"><ArrowDown size={15} /></button>
        <button className="btn btn-icon" onClick={onEdit} aria-label="Edit"><Pencil size={15} /></button>
        <button className="btn btn-icon" onClick={onRemove} aria-label="Remove"><X size={15} /></button>
      </div>
    </div>
  );
}
