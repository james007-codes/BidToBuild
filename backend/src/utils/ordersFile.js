import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import Complaint from "../models/Complaint.js";

// The AI assistant's lookup tool reads ai-service/sample_docs/data/orders.json → data.orders[].order_id
const ORDERS_FILE = process.env.ORDERS_FILE
    || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../ai-service/sample_docs/data/orders.json");

// Writes run one at a time so two complaints filed together don't overwrite each other
let queue = Promise.resolve();

const toRecord = (c) => ({
    order_id: c.ticketNo,
    reported_by: c.reportedBy?._id?.toString() ?? c.reportedBy?.toString(),
    title: c.title,
    description: c.description,
    flair: c.flair,
    location: {
        building: c.location.building,
        floor: c.location.floor,
        roomName: c.location.roomName,
        roomType: c.location.roomType,
        spot: c.location.spot ?? null,
    },
    priority: c.priority,
    status: c.status,
    placed_at: c.createdAt,
    status_updated_at: c.updatedAt,
    customer_safe_message: `Complaint ${c.ticketNo} "${c.title}" in ${c.location.roomName} is ${c.status} with ${c.priority} priority.`,
});

/** Add or update complaints in orders.json, keeping everything else in the file. Never throws. */
function upsert(complaints) {
    queue = queue.then(async () => {
        let data = {};
        try {
            data = JSON.parse(await fs.readFile(ORDERS_FILE, "utf-8"));
        } catch {
            // Missing or unreadable file: start fresh
        }
        if (!Array.isArray(data.orders)) data.orders = [];

        for (const record of complaints.map(toRecord)) {
            const i = data.orders.findIndex((o) => o.order_id === record.order_id);
            if (i >= 0) data.orders[i] = record;
            else data.orders.push(record);
        }

        const tmp = `${ORDERS_FILE}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(data, null, 2));
        await fs.rename(tmp, ORDERS_FILE);
    }).catch((error) => console.warn(`Could not write ${ORDERS_FILE}: ${error.message}`));
    return queue;
}

export const saveComplaintToOrdersFile = (c) => upsert([c]);

/** On backend start: copy every complaint in the database into orders.json. */
export async function syncOrdersFile() {
    const complaints = await Complaint.find().lean();
    await upsert(complaints);
    console.log(`orders.json synced with ${complaints.length} complaints`);
}
