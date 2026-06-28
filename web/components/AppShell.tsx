"use client";

import { Boxes, Repeat } from "lucide-react";
import { THEMES, useTheme } from "./theme";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen">
      <aside className="surface sticky top-0 flex h-screen w-[210px] shrink-0 flex-col p-3">
        <div className="px-2 py-3">
          <div className="text-lg font-bold leading-tight">Berichan</div>
          <div className="accent-text text-lg font-bold leading-tight">Trader</div>
        </div>

        <nav className="mt-3 space-y-1">
          <button className="nav-item" data-active="true">
            <Boxes size={18} /> Team Builder
          </button>
          <button className="nav-item" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
            <Repeat size={18} /> Trade
            <span className="chip ml-auto">soon</span>
          </button>
        </nav>

        <div className="mt-auto">
          <div className="muted mb-1 px-2 text-xs">Appearance</div>
          <div className="grid grid-cols-3 gap-1">
            {THEMES.map((t) => (
              <button
                key={t.key}
                className="btn"
                onClick={() => setTheme(t.key)}
                style={theme === t.key ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "transparent" } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden p-6">{children}</main>
    </div>
  );
}
