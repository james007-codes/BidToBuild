import React from "react";
import { Check, Siren } from "lucide-react";
import { COLORS, STATUS_COLORS } from "../../styles/tokens.js";

// Three visible steps. "Escalated" replaces the middle step (and turns it red).
export function StatusStepper({ status }) {
  const escalated = status === "Escalated";
  const steps = ["Reported", escalated ? "Escalated" : "In Progress", "Resolved"];
  const current = status === "Resolved" ? 3 : status === "Reported" ? 0 : 1;

  return (
    <ol className="flex items-center w-full" aria-label="Complaint progress">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const tone = active && escalated ? STATUS_COLORS.Escalated.fg : done ? COLORS.success : active ? COLORS.primary : COLORS.line;

        return (
          <li key={s} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`} aria-current={active ? "step" : undefined}>
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition"
                style={{
                  backgroundColor: done || active ? tone : COLORS.surface2,
                  color: done || active ? "white" : COLORS.slate,
                  border: `2px solid ${tone}`,
                  boxShadow: active ? `0 0 0 4px ${escalated ? STATUS_COLORS.Escalated.bg : COLORS.primarySoft}, 0 0 18px -2px ${tone}` : "none",
                }}
              >
                {done ? <Check className="w-4 h-4" /> : active && escalated ? <Siren className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-center" style={{ color: done || active ? COLORS.ink : COLORS.slate }}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 -mt-5 mx-1 rounded" style={{ backgroundColor: i < current ? COLORS.success : COLORS.line }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default StatusStepper;
