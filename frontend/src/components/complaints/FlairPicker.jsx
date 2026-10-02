import React from "react";
import { COLORS } from "../../styles/tokens.js";
import { flairsByGroup, getFlair } from "../../data/config.js";
import { FlairChip, PriorityBadge } from "../shared/Badges.jsx";

export function FlairPicker({ value, onChange }) {
  const selected = value ? getFlair(value) : null;

  return (
    <div className="space-y-5">
      {flairsByGroup.map((g) => (
        <div key={g.id}>
          <h4 className="text-xs font-medium mb-2" style={{ color: COLORS.slate }}>{g.label}</h4>
          <div className="flex flex-wrap gap-2">
            {g.flairs.map((f) => (
              <FlairChip key={f.id} flair={f.id} size="lg" selected={value === f.id} onClick={() => onChange(f.id)} />
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <div className="flex flex-wrap items-center gap-2 rounded-md px-4 py-3 text-sm" style={{ backgroundColor: COLORS.bg }}>
          <span style={{ color: COLORS.slate }}>Default priority for</span>
          <span className="font-semibold" style={{ color: COLORS.ink }}>{selected.label}:</span>
          <PriorityBadge priority={selected.defaultPriority} />
          <span className="text-xs" style={{ color: COLORS.slate }}>(details you write can raise it)</span>
          {selected.handledBy && (
            <span className="w-full text-xs" style={{ color: COLORS.slate }}>Usually handled by: <span style={{ color: COLORS.ink }}>{selected.handledBy}</span></span>
          )}
        </div>
      )}
    </div>
  );
}

export default FlairPicker;
