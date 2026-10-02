import React from "react";
import {
  Zap, Flame, PlugZap, Lightbulb, Fan, AirVent, Projector, Presentation, Armchair, Monitor, Wifi,
  FlaskConical, GlassWater, Droplets, Bath, Bug, UtensilsCrossed, CookingPot, ArrowUpDown,
  Construction, Sparkles, CircleHelp, TrendingUp, Repeat, Printer, AppWindow, DoorOpen, Library, CircleParking, Cctv, Trees,
} from "lucide-react";

import { COLORS, PRIORITY_COLORS, STATUS_COLORS } from "../../styles/tokens.js";
import { getFlair } from "../../data/config.js";

/* =========================
   FLAIR ICONS (names come from complaintConfig.json)
========================= */

const ICONS = {
  Zap, Flame, PlugZap, Lightbulb, Fan, AirVent, Projector, Presentation, Armchair, Monitor, Wifi,
  FlaskConical, GlassWater, Droplets, Bath, Bug, UtensilsCrossed, CookingPot, ArrowUpDown,
  Construction, Sparkles, CircleHelp, Printer, AppWindow, DoorOpen, Library, CircleParking, Cctv, Trees,
};

export function FlairIcon({ name, className = "w-4 h-4", style }) {
  const Icon = ICONS[name] || CircleHelp;
  return <Icon className={className} style={style} aria-hidden="true" />;
}

/* Neutral chip — color lives only on the icon */
export function FlairChip({ flair: flairId, size = "sm", selected, onClick }) {
  const f = getFlair(flairId);
  const Tag = onClick ? "button" : "span";
  const pad = size === "lg" ? "h-8 px-3 text-[13px]" : "h-6 px-2 text-xs";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors ${pad} ${
        onClick ? "hover:border-zinc-600 hover:bg-hover" : ""
      }`}
      style={{
        backgroundColor: selected ? COLORS.primary : COLORS.surface2,
        color: selected ? "white" : COLORS.ink,
        borderColor: selected ? COLORS.primary : COLORS.line,
      }}
    >
      <FlairIcon name={f.icon} className={size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3"} style={{ color: selected ? "white" : f.color }} />
      {f.label}
    </Tag>
  );
}

/* =========================
   PRIORITY — dot + label
========================= */

export function PriorityBadge({ priority, raised = false }) {
  const s = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;
  const critical = priority === "Critical";

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
      style={{ color: critical ? COLORS.critical : COLORS.ink }}
      title={raised ? "Raised by keyword" : undefined}
    >
      <span className="relative inline-flex w-2 h-2">
        {critical && <span className="animate-ping absolute inset-0 rounded-full opacity-50" style={{ backgroundColor: s.fg }} />}
        <span className="relative w-2 h-2 rounded-full" style={{ backgroundColor: s.fg }} />
      </span>
      {priority}
      {raised && <TrendingUp className="w-3 h-3" style={{ color: COLORS.critical }} aria-label="raised by keyword" />}
    </span>
  );
}

/* =========================
   STATUS — outlined with a status ring
========================= */

export function StatusPill({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.Reported;
  const done = status === "Resolved";
  return (
    <span
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-xs font-medium whitespace-nowrap"
      style={{ borderColor: COLORS.line, color: COLORS.ink }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{
          border: `1.5px solid ${s.fg}`,
          background: done || status === "Escalated" ? s.fg : status === "In Progress" ? `conic-gradient(${s.fg} 0 50%, transparent 50% 100%)` : "transparent",
        }}
      />
      {status}
    </span>
  );
}

/* =========================
   MISC TAGS
========================= */

export function RoomTypeTag({ roomType }) {
  if (!roomType) return null;
  return (
    <span className="text-xs whitespace-nowrap" style={{ color: COLORS.slate }}>
      {roomType}
    </span>
  );
}

export function RecurringTag({ count }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap" style={{ color: COLORS.warning }} title="Recurring issue">
      <Repeat className="w-3 h-3" aria-hidden="true" />
      {count ? `${count + 1}× this month` : "Recurring"}
    </span>
  );
}

