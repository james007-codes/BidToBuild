import mongoose from "mongoose";

import Complaint from "../models/Complaint.js";
import config, { flairById } from "../config/complaintConfig.js";
import { findRecurrence } from "../utils/recurrence.js";
import { serializeComplaint } from "../utils/serializeComplaint.js";
import { buildStats } from "../utils/complaintStats.js";
import { learnFromComplaint, getModelStats, retrainFromDatabase } from "../services/priorityModel.js";
import { saveComplaintToOrdersFile } from "../utils/ordersFile.js";
import { fileUrl, cleanupFiles } from "../middleware/uploadMiddleware.js";

const POPULATE = [
    { path: "reportedBy", select: "name email" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function loadComplaint(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Complaint.findById(id);
}

async function respondWithDetail(res, complaint, extra = {}) {
    await complaint.populate(POPULATE);
    const recurrence = await findRecurrence({
        roomId: complaint.location.roomId,
        flair: complaint.flair,
        before: complaint.createdAt,
        excludeId: complaint._id,
    });
    return res.json({ success: true, complaint: serializeComplaint(complaint, recurrence), ...extra });
}

/* =========================
   GET /api/admin/complaints
   ?status=&priority=&flair=&buildingId=&roomId=&roomType=&recurring=true&search=&sort=priority|newest|oldest&page=1&limit=20
   Default sort: open first, then Critical → Low, then newest
========================= */
export async function listComplaints(req, res) {
    try {
        const q = req.query;
        const match = {};

        if (config.statuses.includes(q.status)) match.status = q.status;
        if (config.priorities.includes(q.priority)) match.priority = q.priority;
        if (flairById[q.flair]) match.flair = q.flair;
        if (typeof q.buildingId === "string" && q.buildingId) match["location.buildingId"] = q.buildingId;
        if (typeof q.roomId === "string" && q.roomId) match["location.roomId"] = q.roomId;
        if (config.roomTypes.includes(q.roomType)) match["location.roomType"] = q.roomType;
        if (q.recurring === "true") match.isRecurring = true;

        if (typeof q.search === "string" && q.search.trim()) {
            const rx = new RegExp(escapeRegex(q.search.trim().slice(0, 100)), "i");
            match.$or = [{ ticketNo: rx }, { title: rx }, { description: rx }, { "location.roomName": rx }];
        }

        const page = Math.max(1, parseInt(q.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(q.limit) || 20));

        const sortStage =
            q.sort === "newest" ? { createdAt: -1 }
            : q.sort === "oldest" ? { createdAt: 1 }
            : { isResolved: 1, priorityRank: -1, createdAt: -1 };

        const [result] = await Complaint.aggregate([
            { $match: match },
            {
                $addFields: {
                    priorityRank: { $indexOfArray: [config.priorities, "$priority"] },
                    isResolved: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
                },
            },
            { $sort: sortStage },
            {
                $facet: {
                    items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                    total: [{ $count: "count" }],
                },
            },
        ]);

        const items = await Complaint.populate(result.items, POPULATE);

        return res.json({
            success: true,
            items: items.map((c) => serializeComplaint(c)),
            total: result.total[0]?.count ?? 0,
            page,
            limit,
        });
    } catch (error) {
        console.error("List complaints error:", error);
        return bad(res, "Failed to load complaints", 500);
    }
}

/* =========================
   GET /api/admin/complaints/:id   (full detail + live recurrence history)
========================= */
export async function getComplaintDetail(req, res) {
    try {
        const complaint = await loadComplaint(req.params.id);
        if (!complaint) return bad(res, "Complaint not found", 404);
        return respondWithDetail(res, complaint);
    } catch (error) {
        console.error("Complaint detail error:", error);
        return bad(res, "Failed to load complaint", 500);
    }
}

/* =========================
   POST /api/admin/complaints/:id/updates   { status, comment }
   The admin drives the workflow directly (no workers):
   - Any open complaint → "In Progress" or "Escalated" (comment optional)
   - Same status + comment = a comment/progress note the reporter sees
   - → Resolved only via /resolve; never back to Reported
========================= */
const UPDATE_STATUSES = ["In Progress", "Escalated"];

export async function addStatusUpdate(req, res) {
    try {
        const { status, comment = "" } = req.body;
        const text = typeof comment === "string" ? comment.trim().slice(0, 1000) : "";

        const complaint = await loadComplaint(req.params.id);
        if (!complaint) return bad(res, "Complaint not found", 404);

        if (!config.statuses.includes(status)) return bad(res, "Invalid status");
        if (complaint.status === "Resolved") return bad(res, "Complaint is already resolved");

        if (status === complaint.status) {
            if (!text) return bad(res, "Add a comment to post an update without changing status");
        } else if (status === "Resolved") {
            return bad(res, "Use the resolve action to resolve a complaint");
        } else if (status === "Reported") {
            return bad(res, "Cannot move a complaint back to Reported");
        } else if (!UPDATE_STATUSES.includes(status)) {
            return bad(res, `Cannot move to ${status}`);
        }

        const changed = status !== complaint.status;
        complaint.status = status;
        complaint.updates.push({
            status,
            comment: text || (changed ? `Status changed to ${status}.` : ""),
            by: req.account.name,
        });

        await complaint.save();
        saveComplaintToOrdersFile(complaint);
        return respondWithDetail(res, complaint);
    } catch (error) {
        console.error("Status update error:", error);
        return bad(res, "Failed to update status", 500);
    }
}

/* =========================
   PATCH /api/admin/complaints/:id/priority   { priority, reason }
========================= */
export async function overridePriority(req, res) {
    try {
        const { priority, reason } = req.body;
        const text = typeof reason === "string" ? reason.trim() : "";

        const complaint = await loadComplaint(req.params.id);
        if (!complaint) return bad(res, "Complaint not found", 404);

        if (!config.priorities.includes(priority)) return bad(res, "Invalid priority");
        if (!text) return bad(res, "A reason is required to override priority");
        if (priority === complaint.priority) return bad(res, `Priority is already ${priority}`);

        const previous = complaint.priority;
        complaint.priority = priority;
        complaint.prioritySource = "admin";
        complaint.priorityOverrideReason = text;
        complaint.updates.push({
            status: complaint.status,
            comment: `Priority changed from ${previous} to ${priority}: ${text}`,
            by: req.account.name,
        });

        await complaint.save();
        saveComplaintToOrdersFile(complaint);
        // The admin's decision is the strongest signal the priority model gets
        learnFromComplaint(complaint);
        return respondWithDetail(res, complaint);
    } catch (error) {
        console.error("Override priority error:", error);
        return bad(res, "Failed to update priority", 500);
    }
}

/* =========================
   POST /api/admin/complaints/:id/resolve   (multipart: note, afterPhoto?)
   Any open status → Resolved
========================= */
export async function resolveComplaint(req, res) {
    const files = req.file ? [req.file] : [];

    try {
        const note = typeof req.body.note === "string" ? req.body.note.trim() : "";

        const complaint = await loadComplaint(req.params.id);
        if (!complaint) {
            cleanupFiles(files);
            return bad(res, "Complaint not found", 404);
        }
        if (complaint.status === "Resolved") {
            cleanupFiles(files);
            return bad(res, "Complaint is already resolved");
        }
        if (!note) {
            cleanupFiles(files);
            return bad(res, "A resolution note is required");
        }

        const resolvedAt = new Date();
        complaint.status = "Resolved";
        complaint.resolution = {
            note,
            afterPhoto: req.file ? { url: fileUrl(req, req.file), name: req.file.originalname } : null,
            resolvedAt,
        };
        complaint.updates.push({ status: "Resolved", comment: note, by: req.account.name, at: resolvedAt });

        await complaint.save();
        saveComplaintToOrdersFile(complaint);
        return respondWithDetail(res, complaint);
    } catch (error) {
        cleanupFiles(files);
        console.error("Resolve complaint error:", error);
        return bad(res, "Failed to resolve complaint", 500);
    }
}

/* =========================
   GET /api/admin/stats?range=7d|30d|all
========================= */
export async function getStats(req, res) {
    try {
        const days = { "7d": 7, "30d": 30 }[req.query.range];
        const filter = days ? { createdAt: { $gte: new Date(Date.now() - days * DAY_MS) } } : {};

        const complaints = await Complaint.find(filter)
            .select("flair flairGroup location priority status isRecurring reporterType reporterDepartment createdAt resolution.resolvedAt")
            .lean();

        return res.json({ success: true, range: days ? req.query.range : "all", ...buildStats(complaints) });
    } catch (error) {
        console.error("Stats error:", error);
        return bad(res, "Failed to load stats", 500);
    }
}

/* =========================
   GET /api/admin/priority-model         → how well the learned model is doing
   POST /api/admin/priority-model/retrain → rebuild it from every complaint
========================= */
export async function getPriorityModel(req, res) {
    const stats = await getModelStats();
    if (!stats) return bad(res, "Priority model is unavailable (is the AI service running?)", 503);
    return res.json({ success: true, model: stats });
}

export async function retrainPriorityModel(req, res) {
    try {
        const stats = await retrainFromDatabase();
        if (!stats) return bad(res, "Priority model is unavailable (is the AI service running?)", 503);
        return res.json({ success: true, model: stats });
    } catch (error) {
        console.error("Retrain priority model error:", error);
        return bad(res, "Failed to retrain priority model", 500);
    }
}
