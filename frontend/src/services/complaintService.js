import { request, toQuery } from "./apiClient.js";

/* =========================
   USER (students / faculty)
========================= */

// Live priority + recurrence preview while typing. Nothing is saved.
export const previewPriority = async ({ flair, title, description, buildingId, floorId, roomId }) => {
    const data = await request("/complaints/preview", {
        method: "POST",
        body: { flair, title, description, buildingId, floorId, roomId },
        fallback: "Failed to preview priority",
    });

    return {
        priority: data.priority,
        source: data.source,
        flairDefault: data.flairDefault,
        basePriority: data.basePriority,
        matchedKeywords: data.matchedKeywords,
        repeatBoost: data.repeatBoost,
        recurrencePreview: data.recurrencePreview,
    };
};

// formData fields: flair, title, description, buildingId, floorId, roomId, spot?, reporterType?
// files: photos (1–3)
export const createComplaint = async (formData) => {
    const data = await request("/complaints", {
        method: "POST",
        body: formData,
        fallback: "Failed to submit complaint",
    });
    return data.complaint;
};

export const getMyComplaints = async ({ status, flair } = {}) => {
    const data = await request(`/complaints/mine${toQuery({ status, flair })}`, {
        fallback: "Failed to load complaints",
    });
    return data.complaints;
};

export const getComplaint = async (id) => {
    const data = await request(`/complaints/${id}`, { fallback: "Failed to load complaint" });
    return data.complaint;
};
