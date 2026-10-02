import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single source of truth for flairs, keywords, locations and workflow.
// The frontend should copy complaintConfig.json (or fetch GET /api/complaints/config).
const config = JSON.parse(
    readFileSync(path.join(__dirname, "complaintConfig.json"), "utf-8")
);

export const flairById = Object.fromEntries(config.flairs.map((f) => [f.id, f]));
export const groupById = Object.fromEntries(config.flairGroups.map((g) => [g.id, g]));
export const PRIORITY_RANK = Object.fromEntries(config.priorities.map((p, i) => [p, i]));

// Resolve building/floor/room ids into names + room type. Returns null if invalid.
export function resolveLocation(buildingId, floorId, roomId) {
    const building = config.buildings.find((b) => b.id === buildingId);
    const floor = building?.floors.find((f) => f.id === floorId);
    const room = floor?.rooms.find((r) => r.id === roomId);

    if (!building || !floor || !room) return null;

    return {
        buildingId: building.id,
        building: building.name,
        floorId: floor.id,
        floor: floor.name,
        roomId: room.id,
        roomName: room.name,
        roomType: room.roomType,
    };
}

export default config;
