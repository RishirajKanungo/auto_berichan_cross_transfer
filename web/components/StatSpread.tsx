"use client";

import { useRef, useState } from "react";
import {
  LABEL_TO_KEY, SP_MAX_PER_STAT, SP_MAX_TOTAL, STAT_ORDER,
  calcAllStatsSp, spToEv, type StatKey, type StatLabel,
} from "@/lib/stats";

const STAT_COLOR: Record<StatLabel, string> = {
  HP: "#ff5959", Atk: "#f5ac78", Def: "#fae078", SpA: "#9db7f5", SpD: "#a7db8d", Spe: "#fa92b2",
};

function barColor(v: number): string {
  const f = Math.max(0, Math.min(1, v / 200));
  const r = f < 0.5 ? 255 : Math.round(255 - 200 * ((f - 0.5) / 0.5));
  const g = f < 0.5 ? Math.round(140 + 200 * (f / 0.5)) : 220;
  return `rgb(${Math.min(r, 255)}, ${Math.min(g, 255)}, 90)`;
}

export function StatSpread({
  baseStats, level, nature, value, onChange,
}: {
  baseStats: Record<StatKey, number>;
  level: number;
  nature: string;
  value: Record<StatLabel, number>;
  onChange: (sp: Record<StatLabel, number>) => void;
}) {
  const [mode, setMode] = useState<"sliders" | "pie">("sliders");
  const totals = calcAllStatsSp(baseStats, value, level, nature);
  const used = STAT_ORDER.reduce((s, l) => s + (value[l] || 0), 0);

  const setStat = (label: StatLabel, raw: number) => {
    let v = Math.max(0, Math.min(SP_MAX_PER_STAT, Math.round(raw)));
    const others = STAT_ORDER.reduce((s, l) => (l === label ? s : s + (value[l] || 0)), 0);
    v = Math.min(v, SP_MAX_TOTAL - others);
    if (v === value[label]) return;
    onChange({ ...value, [label]: v });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="muted text-xs" style={{ color: used > SP_MAX_TOTAL ? "#e74c3c" : undefined }}>
          SP used: {used} / {SP_MAX_TOTAL}
        </span>
        <div className="flex gap-1">
          {(["sliders", "pie"] as const).map((m) => (
            <button
              key={m}
              className="btn"
              data-active={mode === m}
              style={mode === m ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "transparent" } : undefined}
              onClick={() => setMode(m)}
            >
              {m === "sliders" ? "Sliders" : "Pie"}
            </button>
          ))}
        </div>
      </div>

      {mode === "sliders" ? (
        <SliderView baseStats={baseStats} value={value} totals={totals} setStat={setStat} />
      ) : (
        <PieView value={value} totals={totals} setStat={setStat} />
      )}
    </div>
  );
}

function SliderView({
  baseStats, value, totals, setStat,
}: {
  baseStats: Record<StatKey, number>;
  value: Record<StatLabel, number>;
  totals: Record<StatKey, number>;
  setStat: (l: StatLabel, v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {STAT_ORDER.map((label) => {
        const key = LABEL_TO_KEY[label];
        const total = totals[key];
        return (
          <div key={label} className="grid grid-cols-[2.2rem_1.8rem_1fr_1.7rem_2rem] items-center gap-2">
            <span className="text-sm font-bold" style={{ color: STAT_COLOR[label] }}>{label}</span>
            <span className="muted text-xs">{baseStats[key] ?? "—"}</span>
            <input
              type="range" min={0} max={SP_MAX_PER_STAT} value={value[label] || 0}
              onChange={(e) => setStat(label, Number(e.target.value))}
              style={{ accentColor: "var(--accent)" }}
            />
            <span className="text-right text-xs">{value[label] || 0}<span className="muted"> SP</span></span>
            <span className="text-right text-sm font-bold">{total}</span>
          </div>
        );
      })}
      <div className="space-y-1 pt-1">
        {STAT_ORDER.map((label) => {
          const key = LABEL_TO_KEY[label];
          const total = totals[key];
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="muted w-8 text-[10px]">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--panel)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (total / 255) * 100)}%`, background: barColor(total) }} />
              </div>
              <span className="muted w-7 text-right text-[10px]">{spToEv(value[label] || 0)} EV</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PieView({
  value, totals, setStat,
}: {
  value: Record<StatLabel, number>;
  totals: Record<StatKey, number>;
  setStat: (l: StatLabel, v: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const SIZE = 300, C = 150, R = 105;
  const angles: Record<StatLabel, number> = {} as Record<StatLabel, number>;
  STAT_ORDER.forEach((s, i) => (angles[s] = ((-90 + 60 * i) * Math.PI) / 180));

  const pt = (label: StatLabel, frac: number) => [
    C + R * frac * Math.cos(angles[label]),
    C + R * frac * Math.sin(angles[label]),
  ];

  const apply = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * SIZE;
    const y = ((clientY - rect.top) / rect.height) * SIZE;
    const dx = x - C, dy = y - C;
    if (dx === 0 && dy === 0) return;
    const cursor = Math.atan2(dy, dx);
    let best: StatLabel = "HP", bestD = 99;
    for (const s of STAT_ORDER) {
      const d = Math.abs(Math.atan2(Math.sin(cursor - angles[s]), Math.cos(cursor - angles[s])));
      if (d < bestD) { bestD = d; best = s; }
    }
    const sp = Math.round((Math.hypot(dx, dy) / R) * SP_MAX_PER_STAT);
    setStat(best, sp);
  };

  const filled = STAT_ORDER.map((s) => pt(s, (value[s] || 0) / SP_MAX_PER_STAT).join(",")).join(" ");
  const ring = (f: number) => STAT_ORDER.map((s) => pt(s, f).join(",")).join(" ");

  return (
    <div className="flex justify-center select-none">
      <svg
        ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-[300px] max-w-full touch-none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); apply(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (e.buttons & 1) apply(e.clientX, e.clientY); }}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="var(--border)" strokeWidth={1} />
        ))}
        {STAT_ORDER.map((s) => {
          const [x, y] = pt(s, 1);
          return <line key={s} x1={C} y1={C} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
        })}
        <polygon points={filled} fill="rgba(124,77,255,0.35)" stroke="var(--accent)" strokeWidth={2} />
        {STAT_ORDER.map((s) => {
          const [hx, hy] = pt(s, (value[s] || 0) / SP_MAX_PER_STAT);
          const [lx, ly] = pt(s, 1.16);
          return (
            <g key={s}>
              <circle cx={hx} cy={hy} r={4.5} fill="var(--accent)" />
              <text x={lx} y={ly} textAnchor="middle" fontSize={11} fontWeight={700} fill={STAT_COLOR[s]}>
                {s} {totals[LABEL_TO_KEY[s]]}
              </text>
              <text x={lx} y={ly + 12} textAnchor="middle" fontSize={9} fill="var(--muted)">
                {value[s] || 0} SP
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
