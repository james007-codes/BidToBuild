import mongoose from "mongoose";
import config from "../config/complaintConfig.js";

const flairIds = config.flairs.map((f) => f.id);

const photoSchema = new mongoose.Schema(
    { url: { type: String, required: true }, name: { type: String, default: "" } },
    { _id: false }
);

const updateSchema = new mongoose.Schema(
    {
        status: { type: String, enum: config.statuses, required: true },
        comment: { type: String, trim: true, maxlength: 1000, default: "" },
        by: { type: String, required: true },
        at: { type: Date, default: Date.now },
    },
    { _id: true }
);

const complaintSchema = new mongoose.Schema(
    {
        ticketNo: { type: String, required: true, unique: true },

        flair: { type: String, enum: flairIds, required: true },
        flairGroup: { type: String, required: true },

        // Location is resolved server-side from config ids — never trusted from the client
        location: {
            buildingId: { type: String, required: true },
            building: { type: String, required: true },
            floorId: { type: String, required: true },
            floor: { type: String, required: true },
            roomId: { type: String, required: true },
            roomName: { type: String, required: true },
            roomType: { type: String, required: true },
            spot: { type: String, trim: true, maxlength: 200, default: null },
        },

        title: { type: String, required: true, trim: true, maxlength: 150 },
        description: { type: String, required: true, trim: true, maxlength: 2000 },
        photos: { type: [photoSchema], default: [] },

        priority: { type: String, enum: config.priorities, required: true },
        prioritySource: { type: String, enum: ["flair", "keyword", "repeat", "admin"], required: true },
        // Priority from flair + keywords, before repeat escalation
        basePriority: { type: String, enum: config.priorities },
        repeatBoost: {
            room: { type: Number, default: 0 },
            campus: { type: Number, default: 0 },
            reasons: { type: [String], default: [] },
        },
        matchedKeywords: { type: [String], default: [] },
        detectedPriority: { type: String, enum: config.priorities },
        priorityOverrideReason: { type: String, default: null },

        // Guess from the learned priority model at creation time (advisory only)
        mlPrediction: {
            type: new mongoose.Schema(
                {
                    priority: { type: String, enum: config.priorities },
                    confidence: Number,
                    probabilities: { type: Map, of: Number },
                    ready: Boolean,
                    examplesSeen: Number,
                    predictedAt: Date,
                },
                { _id: false }
            ),
            default: null,
        },

        status: { type: String, enum: config.statuses, default: "Reported" },

        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // "Faculty" is legacy data from before the Student/Teacher split
        reporterType: { type: String, enum: ["Student", "Teacher", "Faculty"], default: "Student" },
        reporterDepartment: { type: String, default: null },

        // Snapshot taken at creation (used for list filters and badges).
        // Full history is computed live on the detail endpoints.
        isRecurring: { type: Boolean, default: false },
        recurrenceCount: { type: Number, default: 0 },
        // Earlier reports of the same flair anywhere on campus (priority model input)
        campusRecentCount: { type: Number, default: 0 },

        updates: { type: [updateSchema], default: [] },

        resolution: {
            type: new mongoose.Schema(
                {
                    note: { type: String, trim: true, maxlength: 1000 },
                    afterPhoto: { type: photoSchema, default: null },
                    resolvedAt: { type: Date },
                },
                { _id: false }
            ),
            default: null,
        },
    },
    { timestamps: true }
);

// Supports the recurrence lookup (same room + flair, recent) and dashboard filters
complaintSchema.index({ "location.roomId": 1, flair: 1, createdAt: -1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ reportedBy: 1, createdAt: -1 });

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
