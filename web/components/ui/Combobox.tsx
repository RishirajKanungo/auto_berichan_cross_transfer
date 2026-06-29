"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Editable input with a filtered dropdown. The dropdown is rendered in a portal
 *  with fixed positioning so it never gets clipped by modal overflow or hidden
 *  behind sibling cards' stacking contexts (backdrop-filter). Allows free text. */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  const reposition = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Account for the app's Display-size (CSS `zoom`): getBoundingClientRect is
    // in zoomed/visual pixels while a body-portal's fixed coords are pre-zoom, so
    // divide by the zoom factor (rect width ÷ layout width; 1 when no zoom).
    const zoom = el.offsetWidth ? r.width / el.offsetWidth : 1;
    setRect({ left: r.left / zoom, top: r.bottom / zoom + 4, width: el.offsetWidth });
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onScrollResize = () => reposition();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    // Capture phase so the outside-click still fires inside modals, whose panel
    // stops mousedown propagation (otherwise the dropdown wouldn't close there).
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (q ? options.filter((o) => o.toLowerCase().includes(q)) : options).slice(0, 60);

  const commit = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={inputRef}
        className="input"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      {open && rect && filtered.length > 0 &&
        createPortal(
          <div
            ref={popRef}
            className="surface max-h-56 overflow-y-auto rounded-lg shadow-2xl"
            style={{ position: "fixed", left: rect.left, top: rect.top, width: rect.width, zIndex: 1000, background: "var(--surface)" }}
          >
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--panel)]"
                onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
              >
                {opt}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
