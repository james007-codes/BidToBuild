import env from "../config/env.js";
import Complaint from "../models/Complaint.js";

/**
 * Client for the learned priority model in the AI service (/api/priority).
 *
 * The model is advisory: its guess is stored and shown next to the rule-based
 * priority but never decides it. Every call fails soft — if the AI service is
 * down, complaints are still created and nothing here throws.
 */

const TIMEOUT_MS = 3000;

async function call(path, body, timeout = TIMEOUT_MS) {
    try {
        const res = await fetch(`${env.aiServiceUrl}/api/priority${path}`, {
            method: body ? "POST" : "GET",
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(timeout),
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        return await res.json();
    } catch (error) {
        console.warn(`Priority model ${path} unavailable: ${error.message}`);
        return null;
    }
}

/**
 * Model inputs. Works for a saved Complaint and for an unsaved preview, as long
 * as it has flair, title, description and location.
 */
export const modelFeatures = (c) => ({
    title: c.title || "",
    description: c.description || "",
    flair: c.flair,
    flairGroup: c.flairGroup || "",
    roomType: c.location?.roomType || "",
    buildingId: c.location?.buildingId || "",
    reporterType: c.reporterType === "Faculty" ? "Teacher" : c.reporterType || "",
    roomRecentCount: c.recurrenceCount ?? 0,
    campusRecentCount: c.campusRecentCount ?? 0,
});

// Admin decisions are the real answer; everything else is the rule engine's guess
const labelOf = (c) => ({
    id: c._id.toString(),
    features: modelFeatures(c),
    label: c.priority,
    source: c.prioritySource === "admin" ? "admin" : "rules",
});

/** { priority, confidence, probabilities, ready, examplesSeen } or null */
export async function predictPriority(complaintLike) {
    const p = await call("/predict", modelFeatures(complaintLike));
    return p && { ...p, predictedAt: new Date() };
}

/** Teach the model this complaint's current priority. Fire-and-forget. */
export function learnFromComplaint(complaint) {
    call("/learn", labelOf(complaint));
}

export const getModelStats = () => call("/stats");

/** Rebuild the model from every complaint in the database. */
export async function retrainFromDatabase() {
    const complaints = await Complaint.find()
        .select("title description flair flairGroup location reporterType recurrenceCount campusRecentCount priority prioritySource")
        .lean();
    return call("/retrain", { complaints: complaints.map(labelOf) }, 5 * 60 * 1000);
}

/**
 * On backend start: if the model has never seen any complaints but the
 * database has some, train it from the database.
 */
export async function bootstrapPriorityModel() {
    const stats = await getModelStats();
    if (!stats || stats.examplesSeen > 0) return;

    const total = await Complaint.estimatedDocumentCount();
    if (!total) return;

    const result = await retrainFromDatabase();
    if (result) console.log(`Priority model trained on ${result.examplesSeen} existing complaints`);
}
