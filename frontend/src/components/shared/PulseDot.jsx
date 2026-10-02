import React from "react";
import { COLORS } from "../../styles/tokens.js";

export function PulseDot({ color = COLORS.critical }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
    </span>
  );
}

export function LiveIndicator({ label = "Live" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: COLORS.slate }} title="Refreshes every 20 seconds">
      <PulseDot color={COLORS.success} /> {label}
    </span>
  );
}

export default PulseDot;
