import React, { useEffect, useState } from "react";
import { BarChart3, RefreshCw, Sparkles } from "lucide-react";

import { COLORS, PRIORITY_COLORS, STATUS_COLORS } from "../../styles/tokens.js";
import { ChartCard } from "../../components/analytics/ChartCard.jsx";
import { HBarChart, TrendChart, RoomFlairChart } from "../../components/analytics/Charts.jsx";
import { Card } from "../../components/shared/Card.jsx";
import { Button, EmptyState, ErrorBanner, PageHeader, Skeleton } from "../../components/shared/Feedback.jsx";
import { getStats, getPriorityModel, retrainPriorityModel } from "../../services/adminService.js";
import { usePolling } from "../../utils/usePolling.js";
import { LiveIndicator } from "../../components/shared/PulseDot.jsx";

export const RANGES = [["7d", "7 days"], ["30d", "30 days"], ["all", "All time"]];

export function RangeToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md p-0.5" style={{ backgroundColor: COLORS.lineSoft }} role="group" aria-label="Time range">
      {RANGES.map(([k, l]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          aria-pressed={value === k}
          className="h-7 px-2.5 rounded-[5px] text-xs font-medium transition-colors"
          style={{ backgroundColor: value === k ? COLORS.surface2 : "transparent", color: value === k ? COLORS.ink : COLORS.slate, boxShadow: value === k ? "inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.5)" : "none" }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const pct = (x) => (x == null ? "–" : `${Math.round(x * 100)}%`);

// How the learned priority model is doing. "Recent accuracy" = guesses made
// BEFORE the model saw each complaint's final priority, so it reflects real skill.
function PriorityModelCard() {
  const [model, setModel] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setModel(await getPriorityModel());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const retrain = async () => {
    setBusy(true);
    try {
      setModel(await retrainPriorityModel());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const stat = (label, value, hint) => (
    <div>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.muted }}>{label}</div>
      <div className="text-lg font-semibold mt-0.5" style={{ color: COLORS.ink }}>{value}</div>
      {hint && <div className="text-[11px]" style={{ color: COLORS.muted }}>{hint}</div>}
    </div>
  );

  return (
    <Card className="p-5 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: COLORS.ink }}>
            <Sparkles className="w-4 h-4" style={{ color: COLORS.accent }} /> AI priority model
          </h2>
          <p className="text-xs mt-1" style={{ color: COLORS.slate }}>
            Learns from every complaint and gets better each time an admin changes a priority.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={retrain} disabled={busy}>
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> {busy ? "Retraining…" : "Retrain from all complaints"}
        </Button>
      </div>

      {error && <p className="text-xs" style={{ color: COLORS.warning }}>{error}</p>}
      {!model && !error && <Skeleton className="h-12 rounded-md" />}
      {model && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stat("Complaints learned", model.examplesSeen, model.ready ? "Ready" : "Warming up (needs 20)")}
          {stat("Admin corrections", model.adminLabels)}
          {stat("Recent accuracy", pct(model.recentAccuracy), model.recentWindow ? `last ${model.recentWindow} complaints` : "no new complaints yet")}
          {stat("Agrees with admins", pct(model.recentAdminAccuracy), "on recent priority changes")}
        </div>
      )}
    </Card>
  );
}

export function Analytics() {
  const [range, setRange] = useState("30d");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const load = async ({ silent } = {}) => {
    if (!silent) setStats(null);
    try {
      setStats(await getStats({ range }));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  usePolling(load, 20000, [range]);

  const sorted = (arr, name, value = "count") =>
    [...(arr || [])].sort((a, b) => b[value] - a[value]).map((d) => ({ name: d[name], value: d[value] }));

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto">
      <PageHeader title="Analytics" subtitle="What breaks, where, and how often." action={<div className="flex items-center gap-4"><LiveIndicator /><RangeToggle value={range} onChange={setRange} /></div>} />

      <ErrorBanner message={error} onRetry={load} />

      <PriorityModelCard />

      {!stats && !error && (
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
        </div>
      )}

      {stats && stats.kpis.total === 0 && (
        <Card><EmptyState icon={BarChart3} title="No complaints in this range" message="Try a longer time range." /></Card>
      )}

      {stats && stats.kpis.total > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <ChartCard title="Complaints over time" subtitle="New complaints per day" height="auto">
              <TrendChart data={stats.trend} height={260} />
            </ChartCard>
          </div>

          <ChartCard title="Complaints by issue type" subtitle="Which problems come up most" height="auto">
            <HBarChart data={sorted(stats.byFlair, "label")} />
          </ChartCard>

          <div className="space-y-4">
            <ChartCard title="By category" height="auto">
              <HBarChart data={sorted(stats.byFlairGroup, "label")} />
            </ChartCard>
            <ChartCard title="By room type" height="auto">
              <HBarChart data={sorted(stats.byRoomType, "roomType")} />
            </ChartCard>
          </div>

          <ChartCard title="Reported by department" subtitle="Department of the student or teacher who reported" height="auto">
            <HBarChart data={sorted(stats.byDepartment, "label")} />
          </ChartCard>

          <ChartCard title="Students vs teachers" height="auto">
            <HBarChart data={(stats.byReporterType || []).map((r) => ({ name: r.type, value: r.count }))} />
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard title="What fails where" subtitle="Top rooms by complaints, split by issue type" height="auto">
              <RoomFlairChart matrix={stats.roomFlairMatrix} />
            </ChartCard>
          </div>

          <ChartCard title="By priority" height="auto">
            <HBarChart
              data={["Critical", "High", "Medium", "Low"].map((p) => ({
                name: p,
                value: stats.byPriority.find((x) => x.priority === p)?.count || 0,
                color: PRIORITY_COLORS[p].fg,
              }))}
            />
          </ChartCard>

          <ChartCard title="By status" height="auto">
            <HBarChart
              data={["Reported", "In Progress", "Escalated", "Resolved"].map((s) => ({
                name: s,
                value: stats.byStatus.find((x) => x.status === s)?.count || 0,
                color: STATUS_COLORS[s].fg,
              }))}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}

export default Analytics;
