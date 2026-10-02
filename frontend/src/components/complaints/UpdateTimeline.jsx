import React from "react";
import { COLORS, STATUS_COLORS } from "../../styles/tokens.js";
import { formatDateTime } from "../../utils/format.js";

export function UpdateTimeline({ updates = [] }) {
  if (!updates.length) {
    return <p className="text-sm" style={{ color: COLORS.slate }}>No updates yet.</p>;
  }

  // newest first
  const items = [...updates].sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <ol className="relative space-y-5">
      {items.map((u, i) => {
        const c = STATUS_COLORS[u.status] || STATUS_COLORS.Reported;
        return (
          <li key={u.id || i} className="relative pl-6">
            {i < items.length - 1 && (
              <span className="absolute left-[5px] top-4 bottom-[-20px] w-px" style={{ backgroundColor: COLORS.line }} />
            )}
            <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 bg-surface" style={{ borderColor: c.fg }} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs font-semibold" style={{ color: c.fg }}>{u.status}</span>
              <span className="text-xs" style={{ color: COLORS.slate }}>· {u.by} · {formatDateTime(u.at)}</span>
            </div>
            {u.comment && <p className="text-sm mt-0.5" style={{ color: COLORS.ink }}>{u.comment}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export default UpdateTimeline;
