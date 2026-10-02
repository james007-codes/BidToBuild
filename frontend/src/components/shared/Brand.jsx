import React from "react";
import { COLORS } from "../../styles/tokens.js";

export const APP_NAME = "XIE CampusCare";
export const APP_TAGLINE = "Xavier Institute of Engineering · Mahim, Mumbai";

// Kept for the auth pages; now a quiet static rule instead of an animated line.
export function Vitals({ w = 64 }) {
  return <div aria-hidden="true" style={{ width: w, height: 1, backgroundColor: COLORS.line }} />;
}

export function Mark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="ff-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A99BFF" />
          <stop offset="100%" stopColor="#5B4BD8" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ff-mark)" />
      <path d="M7 16.5 12 7.5l5 9" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="1.4" fill="white" />
    </svg>
  );
}

export function Logo({ size = "md" }) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-2">
      <Mark size={big ? 30 : 22} />
      <div>
        <div className={`font-semibold tracking-tight ${big ? "text-xl" : "text-[15px]"}`} style={{ color: COLORS.ink }}>{APP_NAME}</div>
        {big && <div className="text-[13px]" style={{ color: COLORS.slate }}>{APP_TAGLINE}</div>}
      </div>
    </div>
  );
}
