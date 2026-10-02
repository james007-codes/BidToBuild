import React, { useEffect, useState } from "react";
import { Inbox, FilePlus2 } from "lucide-react";

import { COLORS } from "../../styles/tokens.js";
import { Card } from "../../components/shared/Card.jsx";
import { EmptyState, ErrorBanner, PageHeader, SkeletonCards, Button, inputClass, inputStyle } from "../../components/shared/Feedback.jsx";
import { ComplaintCard } from "../../components/complaints/ComplaintCard.jsx";
import { STATUSES, FLAIRS } from "../../data/config.js";
import { getMyComplaints } from "../../services/complaintService.js";

export function MyComplaints({ onOpenComplaint, onNavigate }) {
  const [status, setStatus] = useState("");
  const [flair, setFlair] = useState("");
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setComplaints(null);
    try {
      setComplaints(await getMyComplaints({ status, flair }));
    } catch (e) {
      setError(e.message);
      setComplaints([]);
    }
  };

  useEffect(() => { load(); }, [status, flair]);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-4xl mx-auto">
      <PageHeader
        title="My complaints"
        subtitle="Everything you've reported, newest first."
        action={<Button onClick={() => onNavigate("report")}><FilePlus2 className="w-4 h-4" /> Report issue</Button>}
      />

      <div className="flex flex-wrap items-center gap-1 mb-3">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatus(s)}
            className={`h-7 px-2.5 rounded-md text-[13px] font-medium transition-colors ${status === s ? "bg-surface border" : "border border-transparent hover:bg-hover"}`}
            style={{ color: status === s ? COLORS.ink : COLORS.slate, borderColor: status === s ? COLORS.line : "transparent" }}
          >
            {s || "All"}
          </button>
        ))}
        <select className={`${inputClass} !w-auto !h-8 ml-auto`} style={inputStyle} value={flair} onChange={(e) => setFlair(e.target.value)} aria-label="Filter by issue type">
          <option value="">All issue types</option>
          {FLAIRS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      <Card className="overflow-hidden divide-y mt-3">
        {complaints === null && <div className="p-4 space-y-3"><SkeletonCards count={4} className="h-10" /></div>}
        {complaints?.map((c) => (
          <ComplaintCard key={c.id} complaint={c} onClick={() => onOpenComplaint(c.id)} />
        ))}

      {complaints?.length === 0 && !error && (
        <>
          <EmptyState
            icon={Inbox}
            title={status || flair ? "No complaints match these filters" : "No complaints yet"}
            message={status || flair ? "Try a different filter." : "Report an issue and it'll show up here."}
          />
        </>
      )}
      </Card>
    </div>
  );
}

export default MyComplaints;
