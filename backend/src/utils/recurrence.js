import Complaint from "../models/Complaint.js";
import config from "../config/complaintConfig.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Find earlier complaints with the same room + flair inside the recurrence window.
 * `before` = the reference time (creation time of the complaint being checked).
 * `excludeId` = the complaint itself.
 */
export async function findRecurrence({ roomId, flair, before = new Date(), excludeId = null }) {
    const windowDays = config.recurrenceWindowDays;
    const since = new Date(before.getTime() - windowDays * DAY_MS);

    const query = {
        "location.roomId": roomId,
        flair,
        createdAt: { $gte: since, $lte: before },
    };
    if (excludeId) query._id = { $ne: excludeId };

    const history = await Complaint.find(query)
        .sort({ createdAt: -1 })
        .select("ticketNo title status createdAt resolution.resolvedAt")
        .lean();

    return {
        isRecurring: history.length > 0,
        count: history.length,
        windowDays,
        history: history.map((h) => ({
            id: h._id.toString(),
            ticketNo: h.ticketNo,
            title: h.title,
            status: h.status,
            createdAt: h.createdAt,
            resolvedAt: h.resolution?.resolvedAt ?? null,
        })),
    };
}

/**
 * Count earlier complaints with the same flair anywhere on campus inside
 * repeatEscalation.campusWide.windowDays (used for campus-wide priority boosts).
 */
export async function countCampusWide({ flair, before = new Date(), excludeId = null }) {
    const windowDays = config.repeatEscalation?.campusWide?.windowDays;
    if (!windowDays) return 0;

    const query = {
        flair,
        createdAt: { $gte: new Date(before.getTime() - windowDays * DAY_MS), $lte: before },
    };
    if (excludeId) query._id = { $ne: excludeId };

    return Complaint.countDocuments(query);
}
