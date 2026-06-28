"use client";

import { useEffect, useRef, useState } from "react";

/** Editable input with a filtered dropdown. Allows free text too. */
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (q ? options.filter((o) => o.toLowerCase().includes(q)) : options).slice(0, 60);

  const commit = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <input
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
      {open && filtered.length > 0 && (
        <div
          className="surface absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg shadow-xl"
          style={{ background: "var(--surface)" }}
        >
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--panel)]"
              onMouseDown={(e) => {
                e.preventDefault();
                commit(opt);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
