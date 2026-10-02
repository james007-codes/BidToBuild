import React from "react";
import {
  LayoutGrid,
  Plus,
  Inbox,
  MessageCircle,
  ListTodo,
  Building2,
  BarChart2,
  LogOut,
  X,
} from "lucide-react";

import { COLORS } from "../../styles/tokens.js";
import { Logo } from "../shared/Brand.jsx";
import { initials } from "../../utils/format.js";
import { departmentLabel } from "../../data/config.js";

/* =========================
   NAVIGATION ITEMS (per role)
========================= */

export const NAV_ITEMS = {
  user: [
    { key: "dashboard", label: "Overview", icon: LayoutGrid },
    { key: "report", label: "Report issue", icon: Plus },
    { key: "my-complaints", label: "My complaints", icon: Inbox },
    { key: "assistant", label: "Assistant", icon: MessageCircle },
  ],
  admin: [
    { key: "dashboard", label: "Overview", icon: LayoutGrid },
    { key: "complaints", label: "Queue", icon: ListTodo },
    { key: "locations", label: "Locations", icon: Building2 },
    { key: "analytics", label: "Analytics", icon: BarChart2 },
  ],
};

/* =========================
   SIDEBAR
========================= */

export function Sidebar({ role, user, page, setPage, mobileOpen, setMobileOpen, onLogout, badges = {} }) {
  const items = NAV_ITEMS[role] || NAV_ITEMS.user;

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-4 h-14 flex items-center">
        <Logo />
      </div>

      <nav className="flex-1 px-2 pt-2 space-y-0.5" aria-label="Main navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const active = page === item.key;
          const badge = badges[item.key];

          return (
            <button
              key={item.key}
              onClick={() => {
                setPage(item.key);
                setMobileOpen(false);
              }}
              aria-current={active ? "page" : undefined}
              className={`w-full flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 ${
                active ? "border" : "border border-transparent hover:bg-hover"
              }`}
              style={{
                color: active ? COLORS.ink : COLORS.slate,
                borderColor: active ? "rgba(124,108,242,0.35)" : "transparent",
                backgroundColor: active ? COLORS.primarySoft : undefined,
                boxShadow: active ? "0 0 20px -6px rgba(124,108,242,0.6)" : undefined,
                "--tw-ring-color": COLORS.accent,
              }}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} style={{ color: active ? COLORS.accent : COLORS.muted }} />
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className="text-[11px] tabular-nums font-medium" style={{ color: COLORS.slate }}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t" style={{ borderColor: COLORS.line }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
            style={{ backgroundColor: COLORS.line, color: COLORS.ink }}
          >
            {initials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium truncate" style={{ color: COLORS.ink }}>{user?.name}</div>
            <div className="text-[11px] truncate" style={{ color: COLORS.muted }}>
              {role === "admin" ? "Maintenance admin" : [user?.userType || "Student", departmentLabel(user?.department)].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-md hover:bg-hover transition-colors"
            style={{ color: COLORS.slate }}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-56 shrink-0 border-r h-screen sticky top-0 glass" style={{ borderColor: COLORS.line }}>
        {content}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full w-64 border-r" style={{ backgroundColor: "#0C0C0E", borderColor: COLORS.line }} role="dialog" aria-modal="true" aria-label="Navigation menu">
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-2 top-3 p-1.5 rounded-md hover:bg-hover">
              <X className="w-4 h-4" />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
