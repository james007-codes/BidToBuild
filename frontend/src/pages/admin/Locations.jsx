import React, { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, X, ShieldAlert, Repeat, MapPinned } from "lucide-react";

import { COLORS } from "../../styles/tokens.js";
import { Card } from "../../components/shared/Card.jsx";
import { ChartCard } from "../../components/analytics/ChartCard.jsx";
import { HBarChart } from "../../components/analytics/Charts.jsx";
import { FlairChip, PriorityBadge, StatusPill, RoomTypeTag } from "../../components/shared/Badges.jsx";
import { EmptyState, ErrorBanner, PageHeader, Skeleton } from "../../components/shared/Feedback.jsx";
import { BUILDINGS, ROOM_TYPES, getFlair } from "../../data/config.js";
import { timeAgo } from "../../utils/format.js";
import { getAllComplaints } from "../../services/adminService.js";
import { usePolling } from "../../utils/usePolling.js";
import { LiveIndicator } from "../../components/shared/PulseDot.jsx";

const isOpen = (c) => c.status !== "Resolved";

// Loads every complaint (paged, 100 at a time) — fine for a campus-sized dataset.
async function loadAll() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const { items, total } = await getAllComplaints({ page, limit: 100, sort: "newest" });
    all.push(...items);
    if (all.length >= total || items.length === 0) break;
  }
  return all;
}

export function Locations({ onSelect }) {
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState("");
  const [roomType, setRoomType] = useState("");
  const [expanded, setExpanded] = useState({});
  const [roomId, setRoomId] = useState(null);

  const load = async ({ silent } = {}) => {
    try {
      setComplaints(await loadAll());
      setError("");
    } catch (e) {
      setError(e.message);
      if (!silent) setComplaints([]);
    }
  };

  usePolling(load, 20000);

  const filtered = useMemo(
    () => (complaints || []).filter((c) => !roomType || c.location.roomType === roomType),
    [complaints, roomType]
  );

  const byRoom = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const r = (map[c.location.roomId] ||= { total: 0, open: 0, critical: 0, items: [] });
      r.total++;
      if (isOpen(c)) r.open++;
      if (isOpen(c) && c.priority === "Critical") r.critical++;
      r.items.push(c);
    });
    return map;
  }, [filtered]);

  const topRooms = useMemo(
    () =>
      BUILDINGS.flatMap((b) => b.floors.flatMap((f) => f.rooms))
        .filter((r) => byRoom[r.id])
        .map((r) => ({ name: r.name, value: byRoom[r.id].total }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [byRoom]
  );

  const sum = (rooms, key) => rooms.reduce((n, r) => n + (byRoom[r.id]?.[key] || 0), 0);
  const roomsOf = (b) => b.floors.flatMap((f) => f.rooms);
  const visibleRoom = (r) => !roomType || r.roomType === roomType;

  const selectedRoom = roomId && BUILDINGS.flatMap((b) => b.floors.flatMap((f) => f.rooms.map((r) => ({ ...r, building: b.name, floor: f.name })))).find((r) => r.id === roomId);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto">
      <PageHeader title="Locations" subtitle="Where complaints come from across campus." action={<LiveIndicator />} />

      {/* room type chips */}
      <div className="flex flex-wrap gap-1 mb-5">
        {["", ...ROOM_TYPES].map((t) => (
          <button
            key={t || "all"}
            onClick={() => setRoomType(t)}
            className={`h-7 px-2.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors ${roomType === t ? "bg-surface border" : "border border-transparent hover:bg-hover"}`}
            style={{ color: roomType === t ? COLORS.ink : COLORS.slate, borderColor: roomType === t ? COLORS.line : "transparent" }}
          >
            {t || "All rooms"}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {!complaints && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      )}

      {complaints && (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
            {BUILDINGS.filter((b) => roomsOf(b).some(visibleRoom)).map((b) => {
              const rooms = roomsOf(b).filter(visibleRoom);
              const open = expanded[b.id];
              const total = sum(rooms, "total");
              const critical = sum(rooms, "critical");
              return (
                <Card key={b.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpanded((e) => ({ ...e, [b.id]: !e[b.id] }))}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-hover transition"
                    aria-expanded={!!open}
                  >
                    <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: COLORS.primarySoft }}>
                      <Building2 className="w-5 h-5" style={{ color: COLORS.primary }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold" style={{ color: COLORS.ink }}>{b.name}</div>
                      <div className="text-xs" style={{ color: COLORS.slate }}>{total} complaint{total === 1 ? "" : "s"} · {sum(rooms, "open")} open</div>
                    </div>
                    {critical > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.criticalSoft, color: COLORS.critical }}>
                        <ShieldAlert className="w-3.5 h-3.5" /> {critical} critical
                      </span>
                    )}
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {open && (
                    <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: COLORS.line }}>
                      {b.floors.filter((f) => f.rooms.some(visibleRoom)).map((f) => (
                        <div key={f.id}>
                          <div className="text-xs font-medium mb-1.5" style={{ color: COLORS.slate }}>{f.name}</div>
                          <div className="space-y-1">
                            {f.rooms.filter(visibleRoom).map((r) => {
                              const s = byRoom[r.id];
                              return (
                                <button
                                  key={r.id}
                                  onClick={() => setRoomId(r.id)}
                                  className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-hover transition"
                                  style={{ backgroundColor: roomId === r.id ? COLORS.primarySoft : undefined }}
                                >
                                  <span className="text-sm font-medium" style={{ color: COLORS.ink }}>{r.name}</span>
                                  <RoomTypeTag roomType={r.roomType} />
                                  <span className="ml-auto text-sm font-semibold" style={{ color: s ? COLORS.ink : COLORS.slate }}>{s?.total || 0}</span>
                                  {s?.critical > 0 && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.critical }} aria-label="has critical" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="space-y-4 lg:sticky lg:top-20">
            {selectedRoom ? (
              <RoomPanel room={selectedRoom} stats={byRoom[selectedRoom.id]} onClose={() => setRoomId(null)} onSelect={onSelect} />
            ) : (
              <ChartCard title="Most complaints by room" subtitle={roomType ? `${roomType}s only` : "All room types"} height="auto">
                {topRooms.length ? <HBarChart data={topRooms} /> : <EmptyState icon={MapPinned} title="No complaints here yet" />}
              </ChartCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomPanel({ room, stats, onClose, onSelect }) {
  const items = stats?.items || [];

  const flairData = Object.entries(
    items.reduce((m, c) => ({ ...m, [c.flair]: (m[c.flair] || 0) + 1 }), {})
  )
    .map(([f, n]) => ({ name: getFlair(f).label, value: n }))
    .sort((a, b) => b.value - a.value);

  const recurring = Object.entries(
    items.filter((c) => c.recurrence?.isRecurring).reduce((m, c) => ({ ...m, [c.flair]: (m[c.flair] || 0) + 1 }), {})
  );

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: COLORS.ink }}>{room.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: COLORS.slate }}>
            <RoomTypeTag roomType={room.roomType} /> {room.floor}, {room.building}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-hover" aria-label="Close room panel"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {[["Total", stats?.total || 0, COLORS.ink], ["Open", stats?.open || 0, COLORS.blue], ["Critical", stats?.critical || 0, COLORS.critical]].map(([l, v, col]) => (
          <div key={l} className="rounded-md px-3 py-2" style={{ backgroundColor: COLORS.bg }}>
            <div className="text-lg font-semibold tracking-tight" style={{ color: col }}>{v}</div>
            <div className="text-xs" style={{ color: COLORS.slate }}>{l}</div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm mt-4" style={{ color: COLORS.slate }}>No complaints for this room.</p>
      ) : (
        <>
          <h3 className="text-[13px] font-medium mt-5 mb-2" style={{ color: COLORS.ink }}>Issue breakdown</h3>
          <HBarChart data={flairData} />

          {recurring.length > 0 && (
            <>
              <h3 className="text-[13px] font-medium mt-5 mb-2" style={{ color: COLORS.ink }}>Recurring issues</h3>
              <div className="flex flex-wrap gap-2">
                {recurring.map(([f, n]) => (
                  <span key={f} className="inline-flex items-center gap-1.5">
                    <FlairChip flair={f} />
                    <span className="text-xs font-semibold inline-flex items-center gap-0.5" style={{ color: COLORS.warning }}><Repeat className="w-3 h-3" />{n}</span>
                  </span>
                ))}
              </div>
            </>
          )}

          <h3 className="text-[13px] font-medium mt-5 mb-2" style={{ color: COLORS.ink }}>Recent complaints</h3>
          <ul className="space-y-1">
            {items.slice(0, 6).map((c) => (
              <li key={c.id}>
                <button onClick={() => onSelect(c.id)} className="w-full flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-hover transition">
                  <span className="text-xs font-mono font-semibold" style={{ color: COLORS.slate }}>{c.ticketNo}</span>
                  <span className="text-sm flex-1 min-w-[120px] truncate" style={{ color: COLORS.ink }}>{c.title}</span>
                  <PriorityBadge priority={c.priority} showIcon={false} />
                  <StatusPill status={c.status} />
                  <span className="text-xs" style={{ color: COLORS.slate }}>{timeAgo(c.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export default Locations;
