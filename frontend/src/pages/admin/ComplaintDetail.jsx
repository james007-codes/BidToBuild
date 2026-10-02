import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, User, Loader2, AlertTriangle, CheckCircle2, Pencil, MessageSquare, Play, Siren } from "lucide-react";

import { COLORS, STATUS_COLORS } from "../../styles/tokens.js";
import { Card } from "../../components/shared/Card.jsx";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog.jsx";
import { Button, ErrorBanner, Skeleton, inputClass, inputStyle } from "../../components/shared/Feedback.jsx";
import { FlairChip, PriorityBadge, StatusPill, RoomTypeTag } from "../../components/shared/Badges.jsx";
import { StatusStepper } from "../../components/complaints/StatusStepper.jsx";
import { UpdateTimeline } from "../../components/complaints/UpdateTimeline.jsx";
import { PhotoGallery } from "../../components/complaints/PhotoGallery.jsx";
import { PhotoDropzone } from "../../components/complaints/PhotoDropzone.jsx";
import { PriorityReason } from "../../components/complaints/PriorityReason.jsx";
import { AIPriorityGuess } from "../../components/complaints/AIPriorityGuess.jsx";
import { RecurrencePanel } from "../../components/complaints/RecurrencePanel.jsx";
import { PRIORITIES } from "../../data/config.js";
import { formatDateTime } from "../../utils/format.js";
import {
  getComplaintDetail, updateStatus, overridePriority, resolveComplaint,
} from "../../services/adminService.js";

export function ComplaintDetail({ id, onBack }) {
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null); // { type: "warning" | "success", text }

  const load = async () => {
    setError("");
    try {
      setC(await getComplaintDetail(id));
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, [id]);

  const onUpdated = (complaint, msg) => {
    setC(complaint);
    setNotice(msg || null);
  };

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: COLORS.primary }}>
        <ArrowLeft className="w-4 h-4" /> All complaints
      </button>

      <ErrorBanner message={error} onRetry={load} />

      {!c && !error && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      )}

      {c && (
        <>
          {notice && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium"
              style={notice.type === "warning"
                ? { backgroundColor: COLORS.warningSoft, color: COLORS.warning }
                : { backgroundColor: COLORS.successSoft, color: COLORS.success }}
            >
              {notice.type === "warning" ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {notice.text}
            </div>
          )}

          <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
            {/* ================= LEFT ================= */}
            <div className="space-y-4 min-w-0">
              <Card className="p-5" style={c.priority === "Critical" && c.status !== "Resolved" ? { borderLeft: `4px solid ${COLORS.critical}`, borderColor: "rgba(239,68,68,0.35)" } : undefined}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-mono font-semibold" style={{ color: COLORS.slate }}>{c.ticketNo}</span>
                  <FlairChip flair={c.flair} />
                  <StatusPill status={c.status} />
                </div>
                <h1 className="text-lg font-semibold tracking-tight mt-3" style={{ color: COLORS.ink }}>{c.title}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm" style={{ color: COLORS.slate }}>
                  <MapPin className="w-4 h-4" />
                  {c.location.roomName} · {c.location.floor}, {c.location.building}
                  <RoomTypeTag roomType={c.location.roomType} />
                  {c.location.spot && <span>· {c.location.spot}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm" style={{ color: COLORS.slate }}>
                  <User className="w-4 h-4" />
                  {c.reportedBy?.name || "Unknown"} · {c.reportedBy?.type}{c.reportedBy?.department ? ` · ${c.reportedBy.department.label}` : ""} · {formatDateTime(c.createdAt)}
                </div>

                <p className="text-sm whitespace-pre-wrap mt-4" style={{ color: COLORS.ink }}>{c.description}</p>

                <div className="mt-4"><PhotoGallery photos={c.photos} /></div>
              </Card>

              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[13px] font-medium mb-2" style={{ color: COLORS.ink }}>Priority</h2>
                    <div className="flex items-center gap-2 mb-1.5">
                      <PriorityBadge priority={c.priority} raised={["keyword", "repeat"].includes(c.prioritySource)} />
                    </div>
                    <PriorityReason complaint={c} />
                    <AIPriorityGuess complaint={c} />
                  </div>
                  <PriorityOverride complaint={c} onUpdated={onUpdated} />
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="text-[13px] font-medium mb-3" style={{ color: COLORS.ink }}>Recurrence history</h2>
                <RecurrencePanel recurrence={c.recurrence} roomName={c.location.roomName} />
              </Card>

              {c.resolution && (
                <Card className="p-5" style={{ borderColor: "rgba(34,197,94,0.3)", backgroundColor: COLORS.successSoft }}>
                  <h2 className="text-[13px] font-medium mb-2" style={{ color: COLORS.success }}>Resolved {formatDateTime(c.resolution.resolvedAt)}</h2>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.ink }}>{c.resolution.note}</p>
                  {c.resolution.afterPhoto && <div className="mt-3"><PhotoGallery photos={[c.resolution.afterPhoto]} /></div>}
                </Card>
              )}
            </div>

            {/* ================= RIGHT ================= */}
            <div className="space-y-4 lg:sticky lg:top-20">
              <Card className="p-5"><StatusStepper status={c.status} /></Card>

              {c.status !== "Resolved" && <UpdatePanel complaint={c} onUpdated={onUpdated} />}
              {c.status !== "Resolved" && <ResolvePanel complaint={c} onUpdated={onUpdated} />}

              <Card className="p-5">
                <h2 className="text-[13px] font-medium mb-4" style={{ color: COLORS.ink }}>Timeline</h2>
                <UpdateTimeline updates={c.updates} />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================
   UPDATE — status + comment (the admin drives the workflow, no workers)
========================= */

const ACTIONS = [
  { key: "comment", label: "Comment", icon: MessageSquare, status: null },
  { key: "progress", label: "In progress", icon: Play, status: "In Progress" },
  { key: "escalate", label: "Escalate", icon: Siren, status: "Escalated" },
];

function UpdatePanel({ complaint: c, onUpdated }) {
  // Hide the action that matches the current status (e.g. no "In progress" when already in progress)
  const actions = ACTIONS.filter((a) => a.status !== c.status);
  const [mode, setMode] = useState(c.status === "Reported" ? "progress" : "comment");
  const [comment, setComment] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!actions.some((a) => a.key === mode)) setMode("comment");
  }, [c.status]);

  const action = ACTIONS.find((a) => a.key === mode) || ACTIONS[0];
  const status = action.status || c.status;
  const changesStatus = status !== c.status;
  const valid = changesStatus || comment.trim();

  const submit = async () => {
    setConfirm(false);
    setBusy(true);
    setError("");
    try {
      const complaint = await updateStatus(c.id, { status, comment: comment.trim() });
      setComment("");
      onUpdated(complaint, {
        type: status === "Escalated" ? "warning" : "success",
        text: changesStatus ? `Marked as ${status}. The reporter can see this update.` : "Comment posted to the reporter's timeline.",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const placeholder = {
    comment: "Write an update for the reporter, e.g. Spare part ordered, arriving tomorrow",
    progress: "Optional note, e.g. Electrician will check it this afternoon",
    escalate: "Why is it escalated? e.g. Needs an outside vendor / principal's approval",
  }[mode];

  return (
    <Card className="p-5">
      <h2 className="text-[13px] font-medium mb-3" style={{ color: COLORS.ink }}>Post an update</h2>

      <div className="grid grid-cols-3 gap-1 rounded-md p-1 mb-3" style={{ backgroundColor: COLORS.lineSoft }} role="group" aria-label="Update type">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          const disabled = !actions.includes(a);
          const active = mode === a.key;
          const tint = a.key === "escalate" ? STATUS_COLORS.Escalated.fg : COLORS.ink;
          return (
            <button
              key={a.key}
              type="button"
              disabled={disabled}
              onClick={() => setMode(a.key)}
              aria-pressed={active}
              className="inline-flex items-center justify-center gap-1.5 h-8 rounded text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor: active ? COLORS.surface2 : "transparent",
                color: active ? tint : COLORS.slate,
                boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.5)" : "none",
              }}
              title={disabled ? `Already ${a.status}` : undefined}
            >
              <Icon className="w-3.5 h-3.5" /> {a.label}
            </button>
          );
        })}
      </div>

      <textarea
        className={`${inputClass} min-h-[88px] py-2`}
        style={inputStyle}
        placeholder={placeholder}
        value={comment}
        maxLength={1000}
        onChange={(e) => setComment(e.target.value)}
      />
      <p className="text-[11px] mt-1.5" style={{ color: COLORS.muted }}>
        {changesStatus ? `Status will change: ${c.status} → ${status}. Comment is optional.` : "Status stays the same. The comment is shown on the reporter's timeline."}
      </p>

      {error && <p className="text-xs mt-2" style={{ color: COLORS.critical }}>{error}</p>}

      <Button
        className="w-full mt-3"
        variant={mode === "escalate" ? "danger" : "primary"}
        disabled={!valid || busy}
        onClick={() => (changesStatus ? setConfirm(true) : submit())}
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {mode === "comment" ? "Post comment" : mode === "progress" ? "Mark in progress" : "Escalate"}
      </Button>

      <ConfirmDialog
        open={confirm}
        title={mode === "escalate" ? "Escalate complaint" : "Mark in progress"}
        message={`Move ${c.ticketNo} from ${c.status} to ${status}? The reporter will see this update.`}
        confirmLabel={mode === "escalate" ? "Escalate" : "Mark in progress"}
        danger={mode === "escalate"}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}

/* =========================
   RESOLVE
========================= */

function ResolvePanel({ complaint: c, onUpdated }) {
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setConfirm(false);
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("note", note.trim());
      if (photo[0]) fd.append("afterPhoto", photo[0]);
      const complaint = await resolveComplaint(c.id, fd);
      onUpdated(complaint, { type: "success", text: `${c.ticketNo} resolved.` });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-[13px] font-medium mb-3" style={{ color: COLORS.ink }}>Resolve</h2>
      <textarea
        className={`${inputClass} min-h-[80px]`}
        style={inputStyle}
        placeholder="What was fixed? e.g. Replaced the faulty switchboard."
        value={note}
        maxLength={1000}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="mt-3">
        <PhotoDropzone files={photo} onChange={setPhoto} max={1} label="Optional after photo" />
      </div>
      {error && <p className="text-xs mt-2" style={{ color: COLORS.critical }}>{error}</p>}
      <Button className="w-full mt-3" style={{ backgroundColor: COLORS.success, color: "white" }} disabled={!note.trim() || busy} onClick={() => setConfirm(true)}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Mark as resolved
      </Button>

      <ConfirmDialog
        open={confirm}
        title="Resolve complaint"
        message={`Mark ${c.ticketNo} as resolved? This closes the complaint for the reporter.`}
        confirmLabel="Resolve"
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}

/* =========================
   PRIORITY OVERRIDE
========================= */

function PriorityOverride({ complaint: c, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState(c.priority);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setPriority(c.priority), [c.priority]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: COLORS.primary }}>
        <Pencil className="w-3.5 h-3.5" /> Override priority
      </button>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const complaint = await overridePriority(c.id, { priority, reason: reason.trim() });
      setOpen(false);
      setReason("");
      onUpdated(complaint, { type: "success", text: `Priority set to ${complaint.priority}.` });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-2 rounded-md p-3" style={{ backgroundColor: COLORS.bg }}>
      <div className="flex flex-wrap gap-2">
        {PRIORITIES.map((p) => (
          <button key={p} onClick={() => setPriority(p)} className="rounded-full transition" style={{ outline: priority === p ? `2px solid ${COLORS.primary}` : "none", outlineOffset: 2 }}>
            <PriorityBadge priority={p} />
          </button>
        ))}
      </div>
      <input className={inputClass} style={inputStyle} placeholder="Reason (required)" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
      {error && <p className="text-xs" style={{ color: COLORS.critical }}>{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => { setOpen(false); setError(""); }}>Cancel</Button>
        <Button disabled={!reason.trim() || priority === c.priority || busy} onClick={submit}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </Button>
      </div>
    </div>
  );
}

export default ComplaintDetail;
