import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, ShieldAlert, Repeat, TrendingUp, CheckCircle2, MapPin } from "lucide-react";

import { COLORS } from "../../styles/tokens.js";
import { Card } from "../../components/shared/Card.jsx";
import { Button, ErrorBanner, inputClass, inputStyle } from "../../components/shared/Feedback.jsx";
import { FlairChip, PriorityBadge, RoomTypeTag } from "../../components/shared/Badges.jsx";
import { LocationPicker, Field, resolveRoom } from "../../components/complaints/LocationPicker.jsx";
import { FlairPicker } from "../../components/complaints/FlairPicker.jsx";
import { PhotoDropzone } from "../../components/complaints/PhotoDropzone.jsx";
import { getFlair, departmentLabel, INSTITUTION } from "../../data/config.js";
import { ordinal } from "../../utils/format.js";
import { previewPriority, createComplaint } from "../../services/complaintService.js";

const STEPS = ["Location", "Issue type", "Details", "Photos", "Review"];

const EMPTY = {
  location: { buildingId: "", floorId: "", roomId: "", spot: "" },
  flair: "",
  title: "",
  description: "",
  photos: [],
};

export function ReportIssue({ user, onOpenComplaint, onNavigate }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const room = resolveRoom(form.location);

  /* ---------- live priority preview (debounced 600ms) ---------- */
  const reqId = useRef(0);
  useEffect(() => {
    if (!form.flair) return;
    const id = ++reqId.current;
    setPreviewing(true);

    const t = setTimeout(async () => {
      try {
        const p = await previewPriority({
          flair: form.flair,
          title: form.title,
          description: form.description,
          ...form.location,
        });
        if (id === reqId.current) setPreview(p);
      } catch {
        // preview is best-effort; fall back to the flair default
        if (id === reqId.current) setPreview(null);
      } finally {
        if (id === reqId.current) setPreviewing(false);
      }
    }, 600);

    return () => clearTimeout(t);
  }, [form.flair, form.title, form.description, form.location.buildingId, form.location.floorId, form.location.roomId]);

  const priority = preview?.priority || (form.flair ? getFlair(form.flair).defaultPriority : null);

  /* ---------- step validation ---------- */
  const canNext = [
    !!room,
    !!form.flair,
    form.title.trim().length >= 5 && form.description.trim().length >= 10,
    form.photos.length >= 1,
    true,
  ][step];

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("flair", form.flair);
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("buildingId", form.location.buildingId);
      fd.append("floorId", form.location.floorId);
      fd.append("roomId", form.location.roomId);
      if (form.location.spot.trim()) fd.append("spot", form.location.spot.trim());
      form.photos.forEach((f) => fd.append("photos", f));

      setCreated(await createComplaint(fd));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- success ---------- */
  if (created) {
    return (
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-xl mx-auto">
        <Card className="p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.successSoft }}>
            <CheckCircle2 className="w-7 h-7" style={{ color: COLORS.success }} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight mt-4" style={{ color: COLORS.ink }}>Complaint submitted</h1>
          <p className="text-sm mt-1" style={{ color: COLORS.slate }}>Maintenance has been notified.</p>

          <div className="mt-6 rounded-lg border p-4 inline-flex flex-col items-center gap-2" style={{ borderColor: COLORS.line }}>
            <span className="text-xs" style={{ color: COLORS.slate }}>Ticket number</span>
            <span className="text-2xl font-mono font-semibold" style={{ color: COLORS.primary }}>{created.ticketNo}</span>
            <PriorityBadge priority={created.priority} raised={["keyword", "repeat"].includes(created.prioritySource)} />
          </div>

          {created.priority === "Critical" && <SafetyBanner className="mt-6 text-left" />}

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button onClick={() => onOpenComplaint(created.id)}>Track complaint</Button>
            <Button variant="ghost" onClick={() => { setCreated(null); setForm(EMPTY); setPreview(null); setStep(0); }}>
              Report another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto">
      <h1 className="text-lg font-semibold tracking-tight" style={{ color: COLORS.ink }}>Report an issue</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: COLORS.slate }}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>

      {/* progress */}
      <div className="flex gap-1.5 mb-6" aria-hidden="true">
        {STEPS.map((s, i) => (
          <div key={s} className="h-1.5 flex-1 rounded-full transition" style={{ backgroundColor: i <= step ? COLORS.primary : COLORS.line }} />
        ))}
      </div>

      <Card className="p-5">
        {step === 0 && (
          <Section title="Where is the problem?">
            <LocationPicker value={form.location} onChange={(location) => set({ location })} />
          </Section>
        )}

        {step === 1 && (
          <Section title="What's wrong?">
            <FlairPicker value={form.flair} onChange={(flair) => set({ flair })} />
          </Section>
        )}

        {step === 2 && (
          <Section title="Describe the issue">
            <div className="space-y-4">
              <Field label="Title" hint="At least 5 characters">
                <input
                  className={inputClass}
                  style={inputStyle}
                  value={form.title}
                  maxLength={120}
                  placeholder={`e.g. ${getFlair(form.flair).label} in ${room?.roomName || "the room"}`}
                  onChange={(e) => set({ title: e.target.value })}
                />
              </Field>
              <Field label="Description" hint="What happened? Mention anything dangerous like sparks, smoke or leaks.">
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  style={inputStyle}
                  value={form.description}
                  maxLength={2000}
                  placeholder="e.g. The switchboard near the door is sparking when the fan is switched on."
                  onChange={(e) => set({ description: e.target.value })}
                />
              </Field>

              <PriorityPreview
                flair={form.flair}
                priority={priority}
                preview={preview}
                loading={previewing}
                roomName={room?.roomName}
              />
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Add photos" subtitle="At least one photo helps maintenance find and fix the problem faster.">
            <PhotoDropzone files={form.photos} onChange={(photos) => set({ photos })} />
          </Section>
        )}

        {step === 4 && (
          <Section title="Review & submit">
            <dl className="divide-y" style={{ borderColor: COLORS.line }}>
              <Row label="Location">
                <span className="inline-flex flex-wrap items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: COLORS.slate }} />
                  {room.roomName} · {room.floor}, {room.building}
                  <RoomTypeTag roomType={room.roomType} />
                </span>
                {form.location.spot && <div className="text-xs mt-1" style={{ color: COLORS.slate }}>Spot: {form.location.spot}</div>}
              </Row>
              <Row label="Issue type"><FlairChip flair={form.flair} /></Row>
              <Row label="Priority">
                <PriorityBadge priority={priority} raised={["keyword", "repeat"].includes(preview?.source)} />
              </Row>
              <Row label="Title">{form.title}</Row>
              <Row label="Description"><span className="whitespace-pre-wrap">{form.description}</span></Row>
              <Row label="Photos">{form.photos.length} attached</Row>
              <Row label="Reported by">
                {user?.name} · {user?.userType || "Student"}
                {departmentLabel(user?.department) && ` · ${departmentLabel(user.department)}`}
              </Row>
            </dl>
            {priority === "Critical" && <SafetyBanner className="mt-4" />}
          </Section>
        )}

        <div className="mt-5"><ErrorBanner message={error} /></div>

        {/* nav */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t" style={{ borderColor: COLORS.line }}>
          <Button variant="ghost" onClick={() => (step === 0 ? onNavigate("dashboard") : setStep(step - 1))} disabled={submitting}>
            <ArrowLeft className="w-4 h-4" /> {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting} variant={priority === "Critical" ? "danger" : "primary"}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit complaint"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* =========================
   PIECES
========================= */

function Section({ title, subtitle, children }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: COLORS.ink }}>{title}</h2>
      {subtitle && <p className="text-sm mt-0.5" style={{ color: COLORS.slate }}>{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="py-3 grid sm:grid-cols-[120px_1fr] gap-1 sm:gap-4 text-sm">
      <dt className="font-medium" style={{ color: COLORS.slate }}>{label}</dt>
      <dd style={{ color: COLORS.ink }}>{children}</dd>
    </div>
  );
}

function SafetyBanner({ className = "" }) {
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-md border px-4 py-3 ${className}`} style={{ backgroundColor: COLORS.criticalSoft, borderColor: "rgba(239,68,68,0.35)", color: COLORS.critical }}>
      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">This looks dangerous. Maintenance has been alerted.</p>
        <p className="text-sm mt-1">{INSTITUTION.emergencyNote}</p>
        <p className="text-xs mt-1 opacity-80">General Office: {INSTITUTION.phone} · {INSTITUTION.email}</p>
      </div>
    </div>
  );
}

function PriorityPreview({ flair, priority, preview, loading, roomName }) {
  const raised = ["keyword", "repeat"].includes(preview?.source);
  const repeatReasons = preview?.repeatBoost?.reasons || [];
  const rec = preview?.recurrencePreview;

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2 rounded-md px-4 py-3" style={{ backgroundColor: COLORS.bg }}>
        <span className="text-sm" style={{ color: COLORS.slate }}>Priority</span>
        <PriorityBadge priority={priority} raised={raised} />
        {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.slate }} />}
        {raised && (
          <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: COLORS.critical }}>
            <TrendingUp className="w-4 h-4" />
            Raised to {priority}
            {preview.matchedKeywords?.length > 0 && ` — matched: ${preview.matchedKeywords.join(", ")}`}
          </span>
        )}
        {repeatReasons.length > 0 && (
          <ul className="w-full text-xs space-y-0.5 pl-6 list-disc" style={{ color: COLORS.warning }}>
            {repeatReasons.map((r) => (
              <li key={r}>Keeps happening: {r}</li>
            ))}
          </ul>
        )}
        {!raised && !loading && (
          <span className="text-xs" style={{ color: COLORS.slate }}>Default for {getFlair(flair).label}</span>
        )}
      </div>

      {priority === "Critical" && <SafetyBanner />}

      {rec?.isRecurring && (
        <div className="flex items-start gap-3 rounded-md px-4 py-3" style={{ backgroundColor: COLORS.warningSoft, color: COLORS.warning }}>
          <Repeat className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm font-medium">
            This issue has been reported {rec.count} time{rec.count > 1 ? "s" : ""} in {roomName} in the last {rec.windowDays} days.
            Yours will be the {ordinal(rec.count + 1)}.
          </p>
        </div>
      )}
    </div>
  );
}

export default ReportIssue;
