import config from "../config/complaintConfig.js";

const departmentLabel = Object.fromEntries(config.departments.map((d) => [d.id, d.label]));

// Legacy "Faculty" rows read as "Teacher"
const reporterTypeOf = (t) => (t === "Faculty" ? "Teacher" : t || "Student");

const departmentOf = (id) => (id ? { id, label: departmentLabel[id] ?? id } : null);

// Converts a Complaint document into the exact shape the frontend expects.
// reportedBy should be populated before calling this.
export function serializeComplaint(doc, recurrence = null) {
    const c = typeof doc.toObject === "function" ? doc.toObject() : doc;

    const reporter = c.reportedBy && typeof c.reportedBy === "object" && c.reportedBy.name
        ? {
              id: c.reportedBy._id.toString(),
              name: c.reportedBy.name,
              email: c.reportedBy.email,
              type: reporterTypeOf(c.reporterType),
              department: departmentOf(c.reporterDepartment),
          }
        : {
              id: c.reportedBy?.toString?.() ?? null,
              name: null,
              email: null,
              type: reporterTypeOf(c.reporterType),
              department: departmentOf(c.reporterDepartment),
          };

    return {
        id: c._id.toString(),
        ticketNo: c.ticketNo,
        flair: c.flair,
        flairGroup: c.flairGroup,
        location: {
            buildingId: c.location.buildingId,
            building: c.location.building,
            floorId: c.location.floorId,
            floor: c.location.floor,
            roomId: c.location.roomId,
            roomName: c.location.roomName,
            roomType: c.location.roomType,
            spot: c.location.spot ?? null,
        },
        title: c.title,
        description: c.description,
        photos: c.photos ?? [],
        priority: c.priority,
        prioritySource: c.prioritySource,
        matchedKeywords: c.matchedKeywords ?? [],
        detectedPriority: c.detectedPriority ?? c.priority,
        basePriority: c.basePriority ?? c.detectedPriority ?? c.priority,
        repeatBoost: {
            room: c.repeatBoost?.room ?? 0,
            campus: c.repeatBoost?.campus ?? 0,
            reasons: c.repeatBoost?.reasons ?? [],
        },
        priorityOverrideReason: c.priorityOverrideReason ?? null,
        mlPrediction: c.mlPrediction
            ? {
                  priority: c.mlPrediction.priority,
                  confidence: c.mlPrediction.confidence,
                  probabilities: c.mlPrediction.probabilities instanceof Map
                      ? Object.fromEntries(c.mlPrediction.probabilities)
                      : c.mlPrediction.probabilities ?? {},
                  ready: c.mlPrediction.ready,
                  examplesSeen: c.mlPrediction.examplesSeen,
              }
            : null,
        status: c.status,
        reportedBy: reporter,
        recurrence: recurrence ?? {
            isRecurring: c.isRecurring,
            count: c.recurrenceCount,
            windowDays: null,
            history: [],
        },
        updates: (c.updates ?? []).map((u) => ({
            id: u._id?.toString(),
            status: u.status,
            comment: u.comment,
            by: u.by,
            at: u.at,
        })),
        resolution: c.resolution ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
