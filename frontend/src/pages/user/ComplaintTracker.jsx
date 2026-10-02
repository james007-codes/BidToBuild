import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, UserCog, Repeat, CheckCircle2 } from "lucide-react";

import { COLORS } from "../../styles/tokens.js";
import { Card } from "../../components/shared/Card.jsx";
import { ErrorBanner, Skeleton } from "../../components/shared/Feedback.jsx";
import { FlairChip, PriorityBadge, StatusPill, RoomTypeTag } from "../../components/shared/Badges.jsx";
import { StatusStepper } from "../../components/complaints/StatusStepper.jsx";
import { UpdateTimeline } from "../../components/complaints/UpdateTimeline.jsx";
import { PhotoGallery } from "../../components/complaints/PhotoGallery.jsx";
import { PriorityReason } from "../../components/complaints/PriorityReason.jsx";
import { formatDateTime, ordinal } from "../../utils/format.js";
import { getComplaint } from "../../services/complaintService.js";

export function ComplaintTracker({ id, onBack }) {
  const [c, setC] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setC(await getComplaint(id));
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, [id]);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: COLORS.primary }}>
        <ArrowLeft className="w-4 h-4" /> My complaints
      </button>

      <ErrorBanner message={error} onRetry={load} />

      {!c && !error && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {c && (
        <>
          <Card className="p-5" style={c.priority === "Critical" && c.status !== "Resolved" ? { borderLeft: `4px solid ${COLORS.critical}`, borderColor: "rgba(239,68,68,0.35)" } : undefined}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono font-semibold" style={{ color: COLORS.slate }}>{c.ticketNo}</span>
              <FlairChip flair={c.flair} />
              <PriorityBadge priority={c.priority} raised={["keyword", "repeat"].includes(c.prioritySource)} />
              <StatusPill status={c.status} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight mt-3" style={{ color: COLORS.ink }}>{c.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm" style={{ color: COLORS.slate }}>
              <MapPin className="w-4 h-4" />
              {c.location.roomName} · {c.location.floor}, {c.location.building}
              <RoomTypeTag roomType={c.location.roomType} />
              {c.location.spot && <span>· {c.location.spot}</span>}
            </div>
            <p className="text-xs mt-2" style={{ color: COLORS.slate }}>Reported {formatDateTime(c.createdAt)}</p>
          </Card>

          <Card className="p-5">
            <StatusStepper status={c.status} />
          </Card>

          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <div className="space-y-4">
              {c.resolution && (
                <Card className="p-5" style={{ borderColor: "rgba(34,197,94,0.3)", backgroundColor: COLORS.successSoft }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5" style={{ color: COLORS.success }} />
                    <h2 className="font-semibold" style={{ color: COLORS.success }}>Resolved {formatDateTime(c.resolution.resolvedAt)}</h2>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.ink }}>{c.resolution.note}</p>
                  {c.resolution.afterPhoto && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold mb-2" style={{ color: COLORS.slate }}>After photo</p>
                      <PhotoGallery photos={[c.resolution.afterPhoto]} />
                    </div>
                  )}
                </Card>
              )}

              <Card className="p-5">
                <h2 className="text-[13px] font-medium mb-2" style={{ color: COLORS.ink }}>Description</h2>
                <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.ink }}>{c.description}</p>
                <h3 className="font-semibold mt-5 mb-2 text-sm" style={{ color: COLORS.ink }}>Photos</h3>
                <PhotoGallery photos={c.photos} />
              </Card>

              <Card className="p-5">
                <h2 className="text-[13px] font-medium mb-4" style={{ color: COLORS.ink }}>Updates</h2>
                <UpdateTimeline updates={c.updates} />
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <h2 className="text-[13px] font-medium mb-3" style={{ color: COLORS.ink }}>Latest from maintenance</h2>
                {(() => {
                  const last = [...c.updates].reverse().find((u) => u.by !== "System");
                  if (!last) {
                    return <p className="text-sm" style={{ color: COLORS.slate }}>Waiting for the maintenance team to pick this up.</p>;
                  }
                  return (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: COLORS.primarySoft }}>
                        <UserCog className="w-4 h-4" style={{ color: COLORS.accent }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm" style={{ color: COLORS.ink }}>{last.comment}</p>
                        <p className="text-xs mt-1" style={{ color: COLORS.muted }}>{last.by} · {formatDateTime(last.at)}</p>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              <Card className="p-5">
                <h2 className="text-[13px] font-medium mb-2" style={{ color: COLORS.ink }}>Why this priority?</h2>
                <PriorityReason complaint={c} />
              </Card>

              {c.recurrence?.isRecurring && (
                <Card className="p-5" style={{ backgroundColor: COLORS.warningSoft, borderColor: "rgba(245,158,11,0.3)" }}>
                  <div className="flex items-start gap-2" style={{ color: COLORS.warning }}>
                    <Repeat className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">
                      This is the {ordinal(c.recurrence.count + 1)} report of this issue in {c.location.roomName} in the last {c.recurrence.windowDays} days.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ComplaintTracker;
