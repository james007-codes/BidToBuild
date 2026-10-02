import React from "react";
import { Sparkles } from "lucide-react";

import { COLORS } from "../../styles/tokens.js";
import { PriorityBadge } from "../shared/Badges.jsx";

// What the learned priority model guessed when this complaint came in.
// Advisory only: it never changes the priority itself.
export function AIPriorityGuess({ complaint: c }) {
  const p = c.mlPrediction;
  if (!p?.priority) return null;

  const agrees = p.priority === c.priority;
  const pct = Math.round((p.confidence || 0) * 100);

  return (
    <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: COLORS.line, color: COLORS.slate }}>
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" style={{ color: COLORS.accent }} />
        <span>AI guess:</span>
        <PriorityBadge priority={p.priority} />
        <span>({pct}% sure)</span>
        <span style={{ color: agrees ? COLORS.success : COLORS.warning }}>
          {agrees ? "· matches current priority" : `· differs from ${c.priority}`}
        </span>
      </div>
      <p className="mt-1" style={{ color: COLORS.muted }}>
        {p.ready
          ? `Learned from ${p.examplesSeen} past complaints. Changing the priority teaches it.`
          : `Still warming up (${p.examplesSeen} complaints seen), so treat this as a rough guess.`}
      </p>
    </div>
  );
}

export default AIPriorityGuess;
