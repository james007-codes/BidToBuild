import React, { useEffect, useState } from "react";
import { Plus, Inbox, MessageCircle, ArrowUpRight } from "lucide-react";

import { COLORS } from "../../styles/tokens.js";
import { Card } from "../../components/shared/Card.jsx";
import { ComplaintCard } from "../../components/complaints/ComplaintCard.jsx";
import { EmptyState, ErrorBanner, Skeleton, Button, SectionTitle } from "../../components/shared/Feedback.jsx";
import { getMyComplaints } from "../../services/complaintService.js";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export function UserDashboard({ user, onNavigate, onOpenComplaint }) {
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setComplaints(await getMyComplaints());
    } catch (e) {
      setError(e.message);
      setComplaints([]);
    }
  };

  useEffect(() => { load(); }, []);

  const count = (fn) => (complaints || []).filter(fn).length;
  const firstName = (user?.name || "").split(" ")[0];

  const stats = complaints
    ? [
        ["Reported", complaints.length],
        ["In progress", count((c) => c.status === "In Progress" || c.status === "Escalated")],
        ["Resolved", count((c) => c.status === "Resolved")],
      ]
    : null;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-10 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: COLORS.ink }}>
            {greeting()}{firstName && `, ${firstName}`}.
          </h1>
          <p className="text-[13px] mt-1" style={{ color: COLORS.slate }}>
            Spotted something broken on campus? Report it in under a minute.
          </p>
        </div>
        <Button onClick={() => onNavigate("report")}>
          <Plus className="w-4 h-4" /> Report issue
        </Button>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      <Card className="grid grid-cols-3 overflow-hidden">
        {(stats || [null, null, null]).map((s, i) => (
          <div key={i} className="px-4 py-4 [&:not(:last-child)]:border-r" style={{ borderColor: COLORS.line }}>
            {s ? (
              <>
                <div className="text-xs" style={{ color: COLORS.slate }}>{s[0]}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight" style={{ color: COLORS.ink }}>{s[1]}</div>
              </>
            ) : (
              <Skeleton className="h-12" />
            )}
          </div>
        ))}
      </Card>

      <section>
        <SectionTitle
          action={
            complaints?.length > 0 && (
              <button onClick={() => onNavigate("my-complaints")} className="inline-flex items-center gap-0.5 text-xs hover:underline" style={{ color: COLORS.slate }}>
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )
          }
        >
          Recent
        </SectionTitle>

        <Card className="overflow-hidden divide-y" style={{ "--tw-divide-opacity": 1 }}>
          {complaints === null && (
            <div className="p-4 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          )}
          {complaints?.slice(0, 5).map((c) => (
            <ComplaintCard key={c.id} complaint={c} onClick={() => onOpenComplaint(c.id)} />
          ))}
          {complaints?.length === 0 && !error && (
            <EmptyState
              icon={Inbox}
              title="No complaints yet"
              message="When you report an issue, you can follow its progress here."
            />
          )}
        </Card>
      </section>

      <button
        onClick={() => onNavigate("assistant")}
        className="w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left bg-surface hover:bg-hover transition-colors"
        style={{ borderColor: COLORS.line }}
      >
        <MessageCircle className="w-4 h-4" strokeWidth={1.75} style={{ color: COLORS.slate }} />
        <div className="flex-1">
          <div className="text-[13px] font-medium" style={{ color: COLORS.ink }}>Have a question?</div>
          <div className="text-xs" style={{ color: COLORS.slate }}>Ask the assistant how reporting works or what happens next.</div>
        </div>
        <ArrowUpRight className="w-4 h-4" style={{ color: COLORS.muted }} />
      </button>
    </div>
  );
}

export default UserDashboard;
