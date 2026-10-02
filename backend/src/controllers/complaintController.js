import mongoose from "mongoose";

import Complaint from "../models/Complaint.js";
import { nextSequence } from "../models/Counter.js";
import config, { flairById, resolveLocation } from "../config/complaintConfig.js";
import { detectPriority, applyRepeatEscalation } from "../utils/priority.js";
import { findRecurrence, countCampusWide } from "../utils/recurrence.js";
import { serializeComplaint } from "../utils/serializeComplaint.js";
import { predictPriority, learnFromComplaint } from "../services/priorityModel.js";
import { saveComplaintToOrdersFile } from "../utils/ordersFile.js";
import { fileUrl, cleanupFiles } from "../middleware/uploadMiddleware.js";

const POPULATE = [
    { path: "reportedBy", select: "name email" },
];

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });

/* =========================
   GET /api/complaints/config
   Flairs, keywords, locations — lets the frontend stay in sync with the server
========================= */
export function getComplaintConfig(req, res) {
    res.json({ success: true, config });
}

/* =========================
   POST /api/complaints/preview
   Live priority + recurrence preview while the user types (nothing is saved)
========================= */
/**
 * Full priority pipeline: flair default → keywords → repeat escalation
 * (same room + flair, and same flair campus-wide).
 */
async function computePriority(flair, title, description, location) {
    const detected = detectPriority(flair, title, description);
    if (!detected) return null;

    const [recurrence, campusPrevious] = await Promise.all([
        location ? findRecurrence({ roomId: location.roomId, flair }) : null,
        countCampusWide({ flair }),
    ]);

    const result = applyRepeatEscalation(detected, {
        roomPrevious: recurrence?.count ?? 0,
        campusPrevious,
        flairLabel: flairById[flair].label,
    });

    return { result, recurrence, campusPrevious };
}

export async function previewPriority(req, res) {
    const { flair, title = "", description = "", buildingId, floorId, roomId } = req.body;

    const location = resolveLocation(buildingId, floorId, roomId);
    const computed = await computePriority(flair, title, description, location);
    if (!computed) return bad(res, "A valid flair is required");

    const { result, recurrence } = computed;

    res.json({
        success: true,
        priority: result.priority,
        source: result.source,
        flairDefault: result.flairDefault,
        basePriority: result.basePriority,
        matchedKeywords: result.matchedKeywords,
        repeatBoost: result.repeatBoost,
        recurrencePreview: recurrence
            ? { isRecurring: recurrence.isRecurring, count: recurrence.count, windowDays: recurrence.windowDays }
            : { isRecurring: false, count: 0, windowDays: config.recurrenceWindowDays },
    });
}

/* =========================
   POST /api/complaints   (multipart/form-data)
   fields: flair, title, description, buildingId, floorId, roomId, spot?
   (reporter type + department come from the user account, not the form)
   files:  photos (1–3 images)
========================= */
export async function createComplaint(req, res) {
    const files = req.files || [];

    try {
        if (req.role !== "user") {
            cleanupFiles(files);
            return bad(res, "Only students/faculty accounts can report issues", 403);
        }

        const { flair, title, description, buildingId, floorId, roomId, spot } = req.body;

        const errors = [];
        if (!flairById[flair]) errors.push("A valid flair is required");
        if (!title?.trim()) errors.push("Title is required");
        if (!description?.trim()) errors.push("Description is required");
        if (!files.length) errors.push("At least one photo is required");

        const location = resolveLocation(buildingId, floorId, roomId);
        if (!location) errors.push("A valid building, floor and room are required");

        if (errors.length) {
            cleanupFiles(files);
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        // Server ALWAYS recomputes priority — the preview shown in the browser is never trusted
        const { result: detected, recurrence, campusPrevious } = await computePriority(flair, title, description, location);

        const reporterType = req.account.userType || "Student";
        const mlPrediction = await predictPriority({
            flair,
            flairGroup: flairById[flair].group,
            title: title.trim(),
            description: description.trim(),
            location,
            reporterType,
            recurrenceCount: recurrence.count,
            campusRecentCount: campusPrevious,
        });

        const seq = await nextSequence("complaint");

        const complaint = await Complaint.create({
            ticketNo: `MT-${seq}`,
            flair,
            flairGroup: flairById[flair].group,
            location: { ...location, spot: spot?.trim() || null },
            title: title.trim(),
            description: description.trim(),
            photos: files.map((f) => ({ url: fileUrl(req, f), name: f.originalname })),
            priority: detected.priority,
            prioritySource: detected.source,
            detectedPriority: detected.priority,
            basePriority: detected.basePriority,
            repeatBoost: detected.repeatBoost,
            matchedKeywords: detected.matchedKeywords,
            status: "Reported",
            reportedBy: req.account._id,
            reporterType,
            reporterDepartment: req.account.department || null,
            isRecurring: recurrence.isRecurring,
            recurrenceCount: recurrence.count,
            campusRecentCount: campusPrevious,
            mlPrediction,
            updates: [
                {
                    status: "Reported",
                    comment: [
                        "Complaint submitted.",
                        detected.matchedKeywords.length
                            ? `Keywords matched: ${detected.matchedKeywords.join(", ")}.`
                            : null,
                        detected.source === "repeat"
                            ? `Priority raised from ${detected.basePriority} to ${detected.priority} because this keeps happening: ${detected.repeatBoost.reasons.join("; ")}.`
                            : detected.source === "keyword"
                              ? `Priority raised to ${detected.priority}.`
                              : null,
                    ]
                        .filter(Boolean)
                        .join(" "),
                    by: "System",
                },
            ],
        });

        // The rule-based priority is a weak label; an admin override later teaches it properly
        learnFromComplaint(complaint);
        // So the AI assistant can look the ticket up
        saveComplaintToOrdersFile(complaint);

        await complaint.populate(POPULATE);

        return res.status(201).json({
            success: true,
            complaint: serializeComplaint(complaint, {
                isRecurring: recurrence.isRecurring,
                count: recurrence.count,
                windowDays: recurrence.windowDays,
                history: [],
            }),
        });
    } catch (error) {
        cleanupFiles(files);
        console.error("Create complaint error:", error);
        return bad(res, "Failed to create complaint", 500);
    }
}

/* =========================
   GET /api/complaints/mine?status=&flair=
========================= */
export async function getMyComplaints(req, res) {
    try {
        const filter = { reportedBy: req.account._id };

        if (config.statuses.includes(req.query.status)) filter.status = req.query.status;
        if (flairById[req.query.flair]) filter.flair = req.query.flair;

        const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).populate(POPULATE);

        return res.json({ success: true, complaints: complaints.map((c) => serializeComplaint(c)) });
    } catch (error) {
        console.error("Get my complaints error:", error);
        return bad(res, "Failed to load complaints", 500);
    }
}

/* =========================
   GET /api/complaints/:id
   Owner only (admins use /api/admin/complaints/:id).
   Returns 404 (not 403) for other users' complaints so ids can't be probed.
========================= */
export async function getMyComplaint(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return bad(res, "Complaint not found", 404);

        const complaint = await Complaint.findOne({ _id: id, reportedBy: req.account._id }).populate(POPULATE);
        if (!complaint) return bad(res, "Complaint not found", 404);

        // Users see the recurrence count, but not other people's complaint details
        const r = await findRecurrence({
            roomId: complaint.location.roomId,
            flair: complaint.flair,
            before: complaint.createdAt,
            excludeId: complaint._id,
        });

        return res.json({
            success: true,
            complaint: serializeComplaint(complaint, {
                isRecurring: r.isRecurring,
                count: r.count,
                windowDays: r.windowDays,
                history: [],
            }),
        });
    } catch (error) {
        console.error("Get complaint error:", error);
        return bad(res, "Failed to load complaint", 500);
    }
}
