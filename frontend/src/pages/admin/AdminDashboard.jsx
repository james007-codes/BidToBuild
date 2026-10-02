import React, { useState } from "react";
import { CheckCircle2, ArrowUpRight } from "lucide-react";

import { COLORS, PRIORITY_COLORS, STATUS_COLORS, glow } from "../../styles/tokens.js";
import { Card } from "../../components/shared/Card.jsx";
import { TrendChart } from "../../components/analytics/Charts.jsx";
import { FlairIcon, RecurringTag } from "../../components/shared/Badges.jsx";
import { ErrorBanner, PageHeader, Skeleton, SectionTitle } from "../../components/shared/Feedback.jsx";
import { LiveIndicator } from "../../components/shared/PulseDot.jsx";
import { PRIORITIES, STATUSES, getFlair } from "../../data/config.js";
import { timeAgo } from "../../utils/format.js";
import { usePolling } from "../../utils/usePolling.js";
import { getStats, getAllComplaints } from "../../services/adminService.js";

export function AdminDashboard({ onSelect: onOpenComplaint, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [urgent, setUrgent] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [s, u] = await Promise.all([
        getStats({ range: "30d" }),
        getAllComplaints({ priority: "Critical", status: "Reported", sort: "oldest", limit: 10 }),
      ]);
      setStats(s);
      setUrgent(u.items);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  usePolling(load, 20000);

  const k = stats?.kpis;
  const countOf = (list, key, value) => list?.find((x) => x[key] === value)?.count ?? 0;

  const kpis = k
    ? [
        ["Open", k.open, `${k.total} reported`],
        ["Critical open", k.criticalOpen, null, k.criticalOpen > 0 ? COLORS.critical : null],
        ["Resolved this week", k.resolvedThisWeek],
        ["Avg. resolution", k.avgResolutionHours != null ? `${k.avgResolutionHours}h` : "—"],
        ["Recurring", k.recurringCount, "same room + issue"],
      ]
    : null;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto space-y-8">
      <PageHeader title="Overview" subtitle="Last 30 days" action={<LiveIndicator />} />

      <ErrorBanner message={error} onRetry={load} />

      {/* KPI strip */}
      <Card className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 overflow-hidden">
        {(kpis || Array.from({ length: 5 })).map((kpi, i) => (
          <div key={i} className="px-4 py-4 border-b lg:border-b-0 sm:[&:not(:last-child)]:border-r" style={{ borderColor: COLORS.line }}>
            {kpi ? (
              <>
                <div className="text-xs" style={{ color: COLORS.slate }}>{kpi[0]}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" style={{ color: kpi[3] || COLORS.ink }}>{kpi[1]}</div>
                {kpi[2] && <div className="text-[11px] mt-0.5" style={{ color: COLORS.muted }}>{kpi[2]}</div>}
              </>
            ) : (
              <Skeleton className="h-12" />
            )}
          </div>
        ))}
      </Card>

      {/* Needs attention */}
      <section>
        <SectionTitle
          action={
            <button onClick={() => onNavigate("complaints")} className="inline-flex items-center gap-0.5 text-xs hover:underline" style={{ color: COLORS.slate }}>
              Open queue <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          Critical &amp; not started{urgent?.length ? <span className="ml-1.5 tabular-nums" style={{ color: COLORS.critical }}>{urgent.length}</span> : null}
        </SectionTitle>
        <Card className="overflow-hidden" style={urgent?.length ? { borderColor: "rgba(239,68,68,0.35)", boxShadow: glow(COLORS.critical, 0.3) } : undefined}>
          {urgent === null && <div className="p-4 space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>}
          {urgent?.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3.5 text-[13px]" style={{ color: COLORS.slate }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: COLORS.success }} /> Every critical complaint is being handled.
            </div>
          )}
          {urgent?.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenComplaint(c.id)}
              className="w-full flex items-center gap-3 px-4 h-11 border-b last:border-0 text-left hover:bg-hover transition-colors"
              style={{ borderColor: COLORS.lineSoft }}
            >
              <span className="relative inline-flex w-2 h-2 shrink-0">
                <span className="animate-ping absolute inset-0 rounded-full opacity-50" style={{ backgroundColor: COLORS.critical }} />
                <span className="relative w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.critical }} />
              </span>
              <span className="font-mono text-xs w-16 shrink-0" style={{ color: COLORS.muted }}>{c.ticketNo}</span>
              <span className="text-[13px] font-medium flex-1 truncate" style={{ color: COLORS.ink }}>{c.title}</span>
              <span className="hidden sm:block text-xs" style={{ color: COLORS.slate }}>{c.location.roomName}</span>
              <span className="text-xs w-14 text-right tabular-nums" style={{ color: COLORS.muted }}>{timeAgo(c.createdAt)}</span>
            </button>
          ))}
        </Card>
      </section>

      {/* Distributions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Distribution
          title="Status"
          loading={!stats}
          items={STATUSES.map((s) => ({ label: s, value: countOf(stats?.byStatus, "status", s), color: STATUS_COLORS[s].fg }))}
        />
        <Distribution
          title="Priority"
          loading={!stats}
          items={[...PRIORITIES].reverse().map((p) => ({ label: p, value: countOf(stats?.byPriority, "priority", p), color: PRIORITY_COLORS[p].fg }))}
        />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card className="p-4">
          <SectionTitle>Complaints per day</SectionTitle>
          {stats ? <TrendChart data={stats.trend} height={200} /> : <Skeleton className="h-[200px]" />}
        </Card>

        <Card className="p-4">
          <SectionTitle
            action={
              <button onClick={() => onNavigate("locations")} className="inline-flex items-center gap-0.5 text-xs hover:underline" style={{ color: COLORS.slate }}>
                Locations <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            Recurring hotspots
          </SectionTitle>
          {!stats && <div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>}
          {stats?.hotspots?.length === 0 && <p className="text-[13px] py-2" style={{ color: COLORS.slate }}>No room has the same issue reported repeatedly.</p>}
          <ul>
            {stats?.hotspots?.slice(0, 6).map((h) => {
              const f = getFlair(h.flair);
              return (
                <li key={`${h.roomId}-${h.flair}`} className="flex items-center gap-2.5 h-10 border-b last:border-0" style={{ borderColor: COLORS.lineSoft }}>
                  <FlairIcon name={f.icon} className="w-3.5 h-3.5 shrink-0" style={{ color: f.color }} />
                  <span className="text-[13px] font-medium" style={{ color: COLORS.ink }}>{h.roomName}</span>
                  <span className="text-xs truncate" style={{ color: COLORS.slate }}>{f.label}</span>
                  <span className="ml-auto"><RecurringTag count={h.count - 1} /></span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* A single stacked bar + legend — reads faster than four colored tiles */
function Distribution({ title, items, loading }) {
  const total = items.reduce((n, i) => n + i.value, 0);

  return (
    <Card className="p-4">
      <SectionTitle action={<span className="text-xs tabular-nums" style={{ color: COLORS.muted }}>{loading ? "" : `${total} total`}</span>}>
        {title}
      </SectionTitle>

      {loading ? (
        <Skeleton className="h-2 mb-4" />
      ) : (
        <div className="flex h-2 rounded-full overflow-hidden gap-[2px] mb-4" style={{ backgroundColor: COLORS.lineSoft }} role="img" aria-label={`${title} distribution`}>
          {items.filter((i) => i.value > 0).map((i) => (
            <div key={i.label} style={{ width: `${(i.value / total) * 100}%`, backgroundColor: i.color }} title={`${i.label}: ${i.value}`} />
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-2">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.slate }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i.color }} />
              {i.label}
            </dt>
            <dd className="text-lg font-semibold tabular-nums mt-0.5 pl-3" style={{ color: COLORS.ink }}>{loading ? "–" : i.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default AdminDashboard;
