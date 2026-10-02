/* ============================================================================
   DESIGN TOKENS — XIE CampusCare (dark premium)
   Near-black surfaces, one violet accent that glows, status colors that pop.
   Charts (recharts/SVG) need literal colors, so these stay hex, not CSS vars.
   ========================================================================== */

export const COLORS = {
  // brand
  primary: "#7C6CF2", // violet — primary buttons, active state
  primaryDark: "#6A59E8",
  primarySoft: "rgba(124,108,242,0.14)",
  accent: "#A99BFF", // lighter violet — links, focus, chart lines
  accentSoft: "rgba(169,155,255,0.12)",

  // surfaces
  bg: "#09090B",
  surface: "#111113", // cards
  surface2: "#18181B", // inputs, chips, raised controls
  hover: "rgba(255,255,255,0.04)",

  // text
  ink: "#FAFAFA",
  slate: "#A1A1AA",
  muted: "#71717A",

  // lines
  line: "#27272A",
  lineSoft: "#1C1C1F",

  // semantic
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.14)",
  success: "#22C55E",
  successSoft: "rgba(34,197,94,0.12)",
  warning: "#F59E0B",
  warningSoft: "rgba(245,158,11,0.12)",
  critical: "#EF4444",
  criticalSoft: "rgba(239,68,68,0.12)",
  gray: "#71717A",
  graySoft: "#1C1C1F",
};

// Priority: Low = gray, Medium = blue, High = amber, Critical = red
export const PRIORITY_COLORS = {
  Low: { fg: COLORS.gray, bg: COLORS.graySoft },
  Medium: { fg: COLORS.blue, bg: COLORS.blueSoft },
  High: { fg: COLORS.warning, bg: COLORS.warningSoft },
  Critical: { fg: COLORS.critical, bg: COLORS.criticalSoft },
};

export const STATUS_COLORS = {
  Reported: { fg: COLORS.gray, bg: COLORS.graySoft },
  Escalated: { fg: "#F43F5E", bg: "rgba(244,63,94,0.12)" },
  "In Progress": { fg: COLORS.warning, bg: COLORS.warningSoft },
  Resolved: { fg: COLORS.success, bg: COLORS.successSoft },
};

// Soft glow used on emphasised surfaces (critical items, active KPI)
export const glow = (color, strength = 0.35) => `0 0 0 1px ${color}33, 0 0 24px -4px ${color}${Math.round(strength * 255).toString(16).padStart(2, "0")}`;
