import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { COLORS } from "../../styles/tokens.js";

export function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={{ backgroundColor: COLORS.lineSoft }} />;
}

export function SkeletonCards({ count = 4, className = "h-24" }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${className} w-full rounded-lg`} />
      ))}
    </>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && <Icon className="w-5 h-5 mb-3" style={{ color: COLORS.muted }} strokeWidth={1.75} />}
      <h3 className="text-sm font-medium" style={{ color: COLORS.ink }}>{title}</h3>
      {message && <p className="text-[13px] mt-1 max-w-sm" style={{ color: COLORS.slate }}>{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-2.5 rounded-md border px-3 py-2 text-[13px]"
      style={{ borderColor: "rgba(239,68,68,0.35)", color: COLORS.critical, backgroundColor: "rgba(239,68,68,0.06)" }}
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1 font-medium hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gradient">{title}</h1>
        {subtitle && <div className="text-[13px] mt-1" style={{ color: COLORS.slate }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-medium" style={{ color: COLORS.ink }}>{children}</h2>
      {action}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }) {
  const styles = {
    primary: { backgroundColor: COLORS.primary, color: "white", borderColor: COLORS.primary },
    danger: { backgroundColor: COLORS.critical, color: "white", borderColor: COLORS.critical },
    ghost: { backgroundColor: COLORS.surface2, color: COLORS.ink, borderColor: COLORS.line },
  };
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-3.5 text-[13px]" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ${variant === "primary" ? "btn-glow" : ""} focus-visible:ring-offset-1 focus-visible:ring-offset-black ${sizes[size]} ${className}`}
      style={{ ...styles[variant], "--tw-ring-color": COLORS.accent }}
      {...rest}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "w-full h-9 rounded-md border px-3 text-[13px] outline-none transition focus:ring-2 bg-surface placeholder:text-zinc-600 disabled:bg-surface2 disabled:text-zinc-600";
export const inputStyle = { borderColor: COLORS.line, "--tw-ring-color": "rgba(124,108,242,.4)" };
