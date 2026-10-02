import React from "react";
import { COLORS } from "../../styles/tokens.js";
import { Card } from "../shared/Card.jsx";

export function ChartCard({ title, children, subtitle, height = 260, action }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-medium" style={{ color: COLORS.ink }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4" style={{ width: "100%", height }}>{children}</div>
    </Card>
  );
}

export default ChartCard;
