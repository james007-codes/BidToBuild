import config, { flairById, groupById } from "../config/complaintConfig.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const countBy = (items, keyFn) => {
    const map = new Map();
    for (const item of items) {
        const key = keyFn(item);
        map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
};

const sortDesc = (arr) => arr.sort((a, b) => b.count - a.count);

/**
 * Pure function: builds the whole admin Stats object from lean complaint docs.
 * Easy to unit test and fast enough for campus-scale data (thousands of rows).
 */
export function buildStats(complaints, now = new Date()) {
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const isOpen = (c) => c.status !== "Resolved";

    const resolved = complaints.filter((c) => c.status === "Resolved" && c.resolution?.resolvedAt);
    const avgResolutionHours = resolved.length
        ? +(
              resolved.reduce(
                  (sum, c) => sum + (new Date(c.resolution.resolvedAt) - new Date(c.createdAt)),
                  0
              ) /
              resolved.length /
              3600000
          ).toFixed(1)
        : 0;

    const kpis = {
        total: complaints.length,
        open: complaints.filter(isOpen).length,
        criticalOpen: complaints.filter((c) => isOpen(c) && c.priority === "Critical").length,
        resolvedThisWeek: resolved.filter((c) => new Date(c.resolution.resolvedAt) >= weekAgo).length,
        avgResolutionHours,
        recurringCount: complaints.filter((c) => c.isRecurring).length,
    };

    const statusCounts = countBy(complaints, (c) => c.status);
    const byStatus = config.statuses.map((status) => ({ status, count: statusCounts.get(status) || 0 }));

    const priorityCounts = countBy(complaints, (c) => c.priority);
    const byPriority = config.priorities.map((priority) => ({
        priority,
        count: priorityCounts.get(priority) || 0,
    }));

    const byFlair = sortDesc(
        [...countBy(complaints, (c) => c.flair)].map(([flair, count]) => ({
            flair,
            label: flairById[flair]?.label ?? flair,
            color: flairById[flair]?.color ?? "#64748B",
            count,
        }))
    );

    const byFlairGroup = sortDesc(
        [...countBy(complaints, (c) => c.flairGroup)].map(([group, count]) => ({
            group,
            label: groupById[group]?.label ?? group,
            count,
        }))
    );

    const byRoomType = sortDesc(
        [...countBy(complaints, (c) => c.location.roomType)].map(([roomType, count]) => ({
            roomType,
            count,
        }))
    );

    const buildingMap = new Map();
    for (const c of complaints) {
        const b = buildingMap.get(c.location.building) || {
            building: c.location.building,
            count: 0,
            open: 0,
            critical: 0,
        };
        b.count += 1;
        if (isOpen(c)) b.open += 1;
        if (c.priority === "Critical") b.critical += 1;
        buildingMap.set(c.location.building, b);
    }
    const byBuilding = sortDesc([...buildingMap.values()]);

    const roomMap = new Map();
    for (const c of complaints) {
        const key = c.location.roomId;
        const r = roomMap.get(key) || {
            roomId: key,
            roomName: c.location.roomName,
            roomType: c.location.roomType,
            building: c.location.building,
            count: 0,
            open: 0,
        };
        r.count += 1;
        if (isOpen(c)) r.open += 1;
        roomMap.set(key, r);
    }
    const topRooms = sortDesc([...roomMap.values()]).slice(0, 10);

    // Room × flair matrix for the top 8 rooms (stacked bar: what fails most where)
    const top8 = new Set(topRooms.slice(0, 8).map((r) => r.roomId));
    const roomFlairMatrix = [
        ...countBy(
            complaints.filter((c) => top8.has(c.location.roomId)),
            (c) => `${c.location.roomId}|${c.flair}`
        ),
    ].map(([key, count]) => {
        const [roomId, flair] = key.split("|");
        return {
            roomId,
            roomName: roomMap.get(roomId).roomName,
            flair,
            label: flairById[flair]?.label ?? flair,
            count,
        };
    });

    // Hotspots: same room + same flair reported 2+ times in the selected range
    const hotspots = sortDesc(
        [...countBy(complaints, (c) => `${c.location.roomId}|${c.flair}`)]
            .filter(([, count]) => count >= 2)
            .map(([key, count]) => {
                const [roomId, flair] = key.split("|");
                const room = roomMap.get(roomId);
                return {
                    roomId,
                    roomName: room.roomName,
                    roomType: room.roomType,
                    building: room.building,
                    flair,
                    label: flairById[flair]?.label ?? flair,
                    count,
                };
            })
    ).slice(0, 10);

    // Who reports: department (null = not set) and Student/Teacher
    const deptLabel = Object.fromEntries(config.departments.map((d) => [d.id, d.label]));
    const byDepartment = sortDesc(
        [...countBy(complaints, (c) => c.reporterDepartment || "unknown")].map(([department, count]) => ({
            department,
            label: deptLabel[department] ?? "Not specified",
            count,
        }))
    );

    const typeCounts = countBy(complaints, (c) => (c.reporterType === "Faculty" ? "Teacher" : c.reporterType || "Student"));
    const byReporterType = config.userTypes.map((type) => ({ type, count: typeCounts.get(type) || 0 }));

    const trendMap = countBy(complaints, (c) => new Date(c.createdAt).toISOString().slice(0, 10));
    const trend = [...trendMap]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        kpis,
        byStatus,
        byPriority,
        byFlair,
        byFlairGroup,
        byRoomType,
        byBuilding,
        topRooms,
        roomFlairMatrix,
        hotspots,
        byDepartment,
        byReporterType,
        trend,
    };
}
