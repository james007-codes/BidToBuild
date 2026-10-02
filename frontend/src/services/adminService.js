import { request, toQuery } from "./apiClient.js";

/* =========================
   COMPLAINTS
========================= */

// filters: status, priority, flair, buildingId, roomId, roomType, recurring, search, sort, page, limit
export const getAllComplaints = async (filters = {}) => {
    const data = await request(`/admin/complaints${toQuery(filters)}`, {
        fallback: "Failed to load complaints",
    });
    return { items: data.items, total: data.total, page: data.page, limit: data.limit };
};

export const getComplaintDetail = async (id) => {
    const data = await request(`/admin/complaints/${id}`, { fallback: "Failed to load complaint" });
    return data.complaint;
};

export const updateStatus = async (id, { status, comment }) => {
    const data = await request(`/admin/complaints/${id}/updates`, {
        method: "POST",
        body: { status, comment },
        fallback: "Failed to update status",
    });
    return data.complaint;
};

export const overridePriority = async (id, { priority, reason }) => {
    const data = await request(`/admin/complaints/${id}/priority`, {
        method: "PATCH",
        body: { priority, reason },
        fallback: "Failed to update priority",
    });
    return data.complaint;
};

// formData fields: note, afterPhoto?
export const resolveComplaint = async (id, formData) => {
    const data = await request(`/admin/complaints/${id}/resolve`, {
        method: "POST",
        body: formData,
        fallback: "Failed to resolve complaint",
    });
    return data.complaint;
};

/* =========================
   PRIORITY MODEL
========================= */

export const getPriorityModel = async () => {
    const data = await request("/admin/priority-model", { fallback: "Priority model is unavailable" });
    return data.model;
};

export const retrainPriorityModel = async () => {
    const data = await request("/admin/priority-model/retrain", {
        method: "POST",
        fallback: "Failed to retrain priority model",
    });
    return data.model;
};

/* =========================
   STATS
========================= */

export const getStats = async ({ range = "30d" } = {}) => {
    const { success, ...stats } = await request(`/admin/stats${toQuery({ range })}`, {
        fallback: "Failed to load stats",
    });
    return stats;
};
