import React from "react";
import { Menu } from "lucide-react";
import { COLORS } from "../../styles/tokens.js";
import { APP_NAME } from "../shared/Brand.jsx";

// Mobile-only top bar; on desktop the sidebar carries the brand and account.
export function Header({ setMobileOpen }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 glass backdrop-blur border-b" style={{ borderColor: COLORS.line }}>
      <div className="flex items-center gap-2 px-4 h-12">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-1.5 -ml-1.5 rounded-md hover:bg-hover">
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <span className="text-[15px] font-semibold tracking-tight" style={{ color: COLORS.ink }}>{APP_NAME}</span>
      </div>
    </header>
  );
}

export default Header;
