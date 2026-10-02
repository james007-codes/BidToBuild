import React from "react";
import { Repeat } from "lucide-react";
import { COLORS } from "../../styles/tokens.js";
import { StatusPill } from "../shared/Badges.jsx";
import { formatDate, ordinal } from "../../utils/format.js";

export function RecurrencePanel({ recurrence, roomName }) {
  if (!recurrence?.isRecurring) {
    return (
      <p className="text-sm" style={{ color: COLORS.slate }}>
        No earlier reports of this issue in {roomName} in the last {recurrence?.windowDays || 30} days.
      </p>
    );
  }

  const nth = recurrence.count + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md px-4 py-3" style={{ backgroundColor: COLORS.warningSoft, color: COLORS.warning }}>
        <Repeat className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-sm font-medium">
          Recurring issue — {ordinal(nth)} report in {recurrence.windowDays || 30} days. Consider a permanent fix.
        </p>
      </div>

      {recurrence.history?.length > 0 && (
        <ol className="space-y-3">
          {recurrence.history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5" style={{ borderColor: COLORS.line }}>
              <span className="text-xs font-mono font-semibold" style={{ color: COLORS.slate }}>{h.ticketNo}</span>
              <span className="text-sm flex-1 min-w-[140px]" style={{ color: COLORS.ink }}>{h.title}</span>
              <StatusPill status={h.status} />
              <span className="text-xs w-full sm:w-auto" style={{ color: COLORS.slate }}>
                Reported {formatDate(h.createdAt)}
                {h.resolvedAt && ` · resolved ${formatDate(h.resolvedAt)}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default RecurrencePanel;
