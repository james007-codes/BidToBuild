import React from "react";
import { COLORS } from "../../styles/tokens.js";
import { getFlair } from "../../data/config.js";

// "Flair default: Medium → raised to Critical by keyword: sparking"
export function priorityReason(c) {
  const flair = getFlair(c.flair);

  if (c.prioritySource === "admin") {
    return `Set to ${c.priority} by admin${c.priorityOverrideReason ? `: ${c.priorityOverrideReason}` : ""} (detected: ${c.detectedPriority})`;
  }
  if (c.prioritySource === "repeat") {
    const base = c.matchedKeywords?.length
      ? `Flair default: ${flair.defaultPriority} → ${c.basePriority} by keyword: ${c.matchedKeywords.join(", ")}`
      : `Flair default: ${flair.defaultPriority}`;
    return `${base} → raised to ${c.priority} because it keeps happening: ${(c.repeatBoost?.reasons || []).join("; ")}`;
  }
  if (c.prioritySource === "keyword") {
    return `Flair default: ${flair.defaultPriority} → raised to ${c.priority} by keyword: ${c.matchedKeywords.join(", ")}`;
  }
  return `Flair default for ${flair.label}: ${c.priority}`;
}

export function PriorityReason({ complaint }) {
  const handledBy = getFlair(complaint.flair).handledBy;
  return (
    <>
      <p className="text-xs" style={{ color: COLORS.slate }}>{priorityReason(complaint)}</p>
      {handledBy && (
        <p className="text-xs mt-1.5" style={{ color: COLORS.slate }}>
          Usually handled by: <span style={{ color: COLORS.ink }}>{handledBy}</span>
        </p>
      )}
    </>
  );
}

export default PriorityReason;
