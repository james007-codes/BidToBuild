import React from "react";
import { Repeat, TrendingUp } from "lucide-react";
import { COLORS, PRIORITY_COLORS } from "../../styles/tokens.js";
import { FlairIcon, StatusPill } from "../shared/Badges.jsx";
import { getFlair } from "../../data/config.js";
import { timeAgo } from "../../utils/format.js";

export function ComplaintTable({ complaints, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] min-w-[760px]">
        <thead>
          <tr className="text-left text-xs border-b" style={{ color: COLORS.muted, borderColor: COLORS.line }}>
            <th className="pl-4 pr-2 h-9 font-medium w-24">Priority</th>
            <th className="px-2 font-medium w-20">ID</th>
            <th className="px-2 font-medium">Issue</th>
            <th className="px-2 font-medium">Location</th>
            <th className="px-2 font-medium">Status</th>
            <th className="px-2 font-medium">Updated</th>
            <th className="pl-2 pr-4 font-medium text-right">Age</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => {
            const f = getFlair(c.flair);
            const p = PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.Low;
            const critical = c.priority === "Critical" && c.status !== "Resolved";
            return (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(c.id)}
                tabIndex={0}
                className="border-b last:border-0 cursor-pointer hover:bg-hover transition-colors focus:outline-none focus-visible:bg-hover"
                style={{ borderColor: COLORS.lineSoft }}
              >
                <td className="pl-4 pr-2 h-11">
                  <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: critical ? COLORS.critical : COLORS.slate }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fg }} />
                    {c.priority}
                    {["keyword", "repeat"].includes(c.prioritySource) && <TrendingUp className="w-3 h-3" aria-label="raised automatically" />}
                  </span>
                </td>
                <td className="px-2 font-mono text-xs whitespace-nowrap" style={{ color: COLORS.muted }}>{c.ticketNo}</td>
                <td className="px-2 max-w-[340px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FlairIcon name={f.icon} className="w-3.5 h-3.5 shrink-0" style={{ color: f.color }} />
                    <span className="truncate font-medium" style={{ color: COLORS.ink }} title={c.title}>{c.title}</span>
                    {c.recurrence?.isRecurring && <Repeat className="w-3.5 h-3.5 shrink-0" style={{ color: COLORS.warning }} aria-label="Recurring" />}
                  </div>
                </td>
                <td className="px-2 whitespace-nowrap">
                  <span style={{ color: COLORS.ink }}>{c.location.roomName}</span>
                  <span className="ml-1.5 text-xs" style={{ color: COLORS.muted }}>{c.location.building}</span>
                </td>
                <td className="px-2"><StatusPill status={c.status} /></td>
                <td className="px-2 whitespace-nowrap text-xs tabular-nums" style={{ color: COLORS.slate }}>{timeAgo(c.updatedAt)}</td>
                <td className="pl-2 pr-4 whitespace-nowrap text-xs text-right tabular-nums" style={{ color: COLORS.muted }}>{timeAgo(c.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ComplaintTable;
