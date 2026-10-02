import React from "react";
import { ChevronRight } from "lucide-react";
import { COLORS } from "../../styles/tokens.js";
import { FlairIcon, PriorityBadge, StatusPill, RecurringTag } from "../shared/Badges.jsx";
import { getFlair } from "../../data/config.js";
import { timeAgo } from "../../utils/format.js";

// One row in a bordered list. Wrap several in <Card className="divide-y">.
export function ComplaintCard({ complaint: c, onClick }) {
  const f = getFlair(c.flair);

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-hover transition-colors focus:outline-none focus-visible:bg-hover"
    >
      <div className="w-8 h-8 rounded-md border flex items-center justify-center shrink-0" style={{ borderColor: COLORS.line }}>
        <FlairIcon name={f.icon} className="w-4 h-4" style={{ color: f.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate" style={{ color: COLORS.ink }}>{c.title}</span>
          {c.recurrence?.isRecurring && <RecurringTag count={c.recurrence.count} />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: COLORS.muted }}>
          <span className="font-mono">{c.ticketNo}</span>
          <span>·</span>
          <span className="truncate">{c.location.roomName}, {c.location.building}</span>
          <span>·</span>
          <span className="whitespace-nowrap">{timeAgo(c.createdAt)}</span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-4 shrink-0">
        <span className="w-20"><PriorityBadge priority={c.priority} raised={["keyword", "repeat"].includes(c.prioritySource)} /></span>
        <StatusPill status={c.status} />
      </div>
      <div className="sm:hidden"><StatusPill status={c.status} /></div>
      <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: COLORS.muted }} />
    </button>
  );
}

export default ComplaintCard;
