import React, { useEffect, useState } from "react";
import { Search, Inbox, ChevronLeft, ChevronRight } from "lucide-react";

import { COLORS } from "../../styles/tokens.js";
import { Card } from "../../components/shared/Card.jsx";
import { LiveIndicator } from "../../components/shared/PulseDot.jsx";
import { EmptyState, ErrorBanner, PageHeader, Skeleton, inputClass, inputStyle } from "../../components/shared/Feedback.jsx";
import { ComplaintTable } from "../../components/complaints/ComplaintTable.jsx";
import { STATUSES, PRIORITIES, FLAIRS, BUILDINGS, ROOM_TYPES } from "../../data/config.js";
import { getAllComplaints } from "../../services/adminService.js";
import { usePolling } from "../../utils/usePolling.js";

const LIMIT = 20;

export function Complaints({ onSelect, initialFilters = {} }) {
  const [filters, setFilters] = useState({
    status: "", priority: "", flair: "", buildingId: "", roomType: "", recurring: false, sort: "priority",
    ...initialFilters,
  });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [filters, debounced]);

  usePolling(
    async ({ silent } = {}) => {
      if (!silent) setData(null);
      try {
        setData(await getAllComplaints({ ...filters, search: debounced, page, limit: LIMIT }));
        setError("");
      } catch (e) {
        setError(e.message);
        if (!silent) setData({ items: [], total: 0, page: 1 });
      }
    },
    20000,
    [filters, debounced, page]
  );

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const active = Object.entries(filters).some(([k, v]) => k !== "sort" && v);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto">
      <PageHeader
        title="Queue"
        subtitle={data ? `${data.total} complaint${data.total === 1 ? "" : "s"}` : "Loading…"}
        action={<LiveIndicator />}
      />

      {/* status tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto" role="tablist">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "all"}
            role="tab"
            aria-selected={filters.status === s}
            onClick={() => set({ status: s })}
            className={`h-7 px-2.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors ${filters.status === s ? "bg-surface border" : "border border-transparent hover:bg-hover"}`}
            style={{ color: filters.status === s ? COLORS.ink : COLORS.slate, borderColor: filters.status === s ? COLORS.line : "transparent" }}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: COLORS.slate }} />
            <input
              type="search"
              className={`${inputClass} !h-8 pl-8`}
              style={inputStyle}
              placeholder="Search ticket, title, room…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search complaints"
            />
          </div>
          <Select value={filters.priority} onChange={(v) => set({ priority: v })} label="All priorities" options={PRIORITIES} />
          <Select value={filters.flair} onChange={(v) => set({ flair: v })} label="All issue types" options={FLAIRS.map((f) => [f.id, f.label])} />
          <Select value={filters.buildingId} onChange={(v) => set({ buildingId: v })} label="All buildings" options={BUILDINGS.map((b) => [b.id, b.name])} />
          <Select value={filters.roomType} onChange={(v) => set({ roomType: v })} label="All room types" options={ROOM_TYPES} />
          <Select
            value={filters.sort}
            onChange={(v) => set({ sort: v })}
            options={[["priority", "Sort: Critical first"], ["newest", "Sort: Newest"], ["oldest", "Sort: Oldest"]]}
          />
          <button
            onClick={() => set({ recurring: !filters.recurring })}
            aria-pressed={filters.recurring}
            className="h-8 px-2.5 rounded-md border text-[13px] font-medium transition-colors"
            style={{ borderColor: filters.recurring ? COLORS.primary : COLORS.line, backgroundColor: filters.recurring ? COLORS.primary : "transparent", color: filters.recurring ? "white" : COLORS.slate }}
          >
            Recurring
          </button>
          {active && (
            <button
              className="text-[13px] px-1.5 hover:underline"
              style={{ color: COLORS.slate }}
              onClick={() => setFilters({ status: "", priority: "", flair: "", buildingId: "", roomType: "", recurring: false, sort: filters.sort })}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <ErrorBanner message={error} />

      <Card className="mt-3 overflow-hidden">
        {!data && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}
        {data?.items.length > 0 && <ComplaintTable complaints={data.items} onSelect={onSelect} />}
        {data?.items.length === 0 && (
          <EmptyState icon={Inbox} title="No complaints found" message={active || debounced ? "Try clearing some filters." : "Nothing has been reported yet."} />
        )}

        {data && data.total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm" style={{ borderColor: COLORS.line, color: COLORS.slate }}>
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border disabled:opacity-40" style={{ borderColor: COLORS.line }} aria-label="Previous page">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border disabled:opacity-40" style={{ borderColor: COLORS.line }} aria-label="Next page">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Select({ value, onChange, label, options }) {
  return (
    <select className={`${inputClass} !w-auto !h-8 pr-7`} style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label || "Sort"}>
      {label && <option value="">{label}</option>}
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

export default Complaints;
