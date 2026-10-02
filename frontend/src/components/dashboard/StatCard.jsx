import React from "react";
import { COLORS } from "../../styles/tokens.js";

// Quiet KPI tile: label, number, optional sub-line. `accent` colors only a small dot.
export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-surface rounded-lg border px-4 py-3.5" style={{ borderColor: COLORS.line }}>
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.slate }}>
        {accent?.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent.fg }} />}
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums" style={{ color: COLORS.ink }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{sub}</div>}
    </div>
  );
}

export default StatCard;
