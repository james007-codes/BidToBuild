/**
 * Demo data seeder.
 *
 *   node src/scripts/seed.js                  -> adds demo complaints (reported by the first user in the DB)
 *   node src/scripts/seed.js you@mail.com     -> complaints reported by that user
 *   node src/scripts/seed.js --reset          -> WIPES complaints and the ticket counter first
 *
 * Register at least one normal user in the app before running this.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import Counter, { nextSequence } from "../models/Counter.js";
import config, { flairById, resolveLocation } from "../config/complaintConfig.js";
import { detectPriority, applyRepeatEscalation } from "../utils/priority.js";

dotenv.config();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const args = process.argv.slice(2);
const reset = args.includes("--reset");
const email = args.find((a) => a.includes("@"));

// Deterministic pseudo-random so every seed run looks the same
let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// [daysAgo, roomId, flair, title, description, finalStatus]
const SCRIPTED = [
    // Demo story: Network Lab (Comp) electrical issue already reported twice this month
    [24, "cmpn-net", "electrical-hazard", "Switchboard sparking near door", "The switchboard next to the lab door made sparks when the AC was switched on.", "Resolved"],
    [9, "cmpn-net", "electrical-hazard", "Exposed wire behind projector socket", "Wire insulation is torn and copper is visible behind the projector socket.", "In Progress"],

    // Washroom tap that leaks every month
    [85, "f1-gents", "plumbing", "Tap leaking in washroom", "Second tap from the left keeps dripping.", "Resolved"],
    [57, "f1-gents", "plumbing", "Same tap leaking again", "The tap that was fixed last month is leaking again.", "Resolved"],
    [29, "f1-gents", "plumbing", "Tap leak back again", "Water dripping all day from the same tap.", "Resolved"],
    [3, "f1-gents", "plumbing", "Washroom tap leaking (again)", "Third time this tap is leaking. Floor stays wet.", "Escalated"],

    // Computer Centre: most complained-about room
    [27, "computer-centre", "computer", "PC 12 not booting", "PC 12 shows a black screen after the BIOS logo.", "Resolved"],
    [20, "computer-centre", "computer", "PC 7 keyboard not working", "Several keys on PC 7 keyboard are dead.", "Resolved"],
    [14, "computer-centre", "network", "No internet on row 3", "All PCs on row 3 show no network connection.", "Resolved"],
    [10, "computer-centre", "computer", "PC 12 not booting again", "Same PC 12 issue during practicals.", "In Progress"],
    [6, "computer-centre", "computer", "Mouse missing at PC 4", "PC 4 has no mouse.", "Reported"],
    [2, "computer-centre", "ac", "AC not cooling", "Centre is very hot, AC is running but not cooling.", "Reported"],

    // Canteen and drinking water
    [18, "canteen", "canteen-hygiene", "Cockroaches near food counter", "Saw cockroaches near the samosa tray.", "Resolved"],
    [5, "canteen", "canteen-hygiene", "Dirty plates being served", "Plates have food stains on them.", "In Progress"],
    [12, "f0-water", "water-filter", "Water purifier giving warm water", "Purifier on the ground floor is giving warm water.", "Resolved"],
    [1, "f0-water", "water-filter", "Water purifier not working", "No water coming from the purifier at all. no water since morning.", "Reported"],
];

const FILLERS = [
    ["classroom-3", "fan", "Fan not working", "Ceiling fan near the window does not start."],
    ["classroom-5", "projector", "Projector flickering", "Projector display keeps flickering during lectures."],
    ["classroom-2", "smart-board", "Smart board not responding", "Touch input on the smart board is not working."],
    ["tutorial-1", "furniture", "Broken bench in last row", "Bench in the last row has a broken plank."],
    ["it-sw1", "smart-board", "Smart board pen not working", "The stylus for the smart board does not register."],
    ["classroom-8", "lights", "Tube light not working", "Two tube lights in the front are off."],
    ["seminar-hall", "ac", "AC leaking water", "AC unit is dripping water on the chairs."],
    ["ece-ae", "lab-equipment", "Oscilloscope faulty", "Oscilloscope on bench 3 gives no display."],
    ["lib-reading", "fan", "Fan making noise", "Fan makes a loud rattling noise."],
    ["lib-computers", "network", "Wi-Fi very slow", "Wi-Fi in the library is extremely slow."],
    ["f2-ladies", "washroom-hygiene", "Washroom not cleaned", "Washroom has not been cleaned since morning."],
    ["f3-gents", "plumbing", "Flush not working", "Flush in the second cubicle is broken."],
    ["f0-lift", "lift", "Lift stuck on 2nd floor", "The lift is stuck between floors."],
    ["f2-corridor", "structural", "Crack in corridor wall", "A long crack has appeared on the corridor wall."],
    ["seminar-hall", "fire-safety", "Fire extinguisher expired", "Extinguisher near the stage shows an expired date."],
    ["canteen", "canteen-equipment", "Mixer not working", "The canteen mixer has stopped working."],
    ["classroom-3", "cleanliness", "Classroom dustbin overflowing", "Dustbin has not been emptied."],
    ["cmpn-net", "fan", "Fan regulator broken", "Fan only runs at full speed."],
    ["it-db", "computer", "PC 3 very slow", "PC 3 takes 10 minutes to boot."],
    ["conference-room", "ac", "Conference room AC not working", "AC does not turn on."],
    ["classroom-6", "fan", "Fan wobbling", "Fan is wobbling dangerously."],
    ["canteen", "canteen-food", "Stale food served", "Vada pav tasted stale."],
    ["cmpn-db", "printer", "Lab printer jammed", "The Canon printer in the lab keeps jamming."],
    ["hod-cabins", "power-outage", "No power in HOD cabins", "No power since 10 am."],
    ["parking", "parking", "Bikes blocking the gate", "Two-wheelers parked across the entry lane."],
    ["fe-lang2", "software", "Language lab software not opening", "The language lab software crashes on start."],
];

const findRoom = (roomId) => {
    for (const b of config.buildings)
        for (const f of b.floors)
            for (const r of f.rooms)
                if (r.id === roomId) return resolveLocation(b.id, f.id, r.id);
    throw new Error(`Unknown room ${roomId}`);
};

async function main() {
    await mongoose.connect(process.env.mongoUri || process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    if (reset) {
        await Promise.all([Complaint.deleteMany({}), Counter.deleteMany({})]);
        console.log("Reset: complaints and counter cleared");
    }

    const reporter = email ? await User.findOne({ email: email.toLowerCase() }) : await User.findOne();
    if (!reporter) throw new Error("No user found. Register a normal user in the app first.");

    const fillerStatuses = ["Resolved", "Resolved", "Resolved", "In Progress", "Escalated", "Reported"];
    const rows = [
        ...SCRIPTED,
        ...FILLERS.map(([room, flair, title, desc]) => [
            Math.floor(rand() * 60) + 1, room, flair, title, desc, pick(fillerStatuses),
        ]),
    ].sort((a, b) => b[0] - a[0]); // oldest first, so recurrence counts build up correctly

    const now = Date.now();
    const created = [];

    for (const [daysAgo, roomId, flair, title, description, finalStatus] of rows) {
        const createdAt = new Date(now - daysAgo * DAY - Math.floor(rand() * 8) * HOUR);
        const location = findRoom(roomId);
        const prior = created.filter(
            (c) =>
                c.location.roomId === roomId &&
                c.flair === flair &&
                createdAt - c.createdAt <= config.recurrenceWindowDays * DAY
        );
        const campusPrior = created.filter(
            (c) => c.flair === flair && createdAt - c.createdAt <= (config.repeatEscalation?.campusWide?.windowDays ?? 0) * DAY
        );
        const detected = applyRepeatEscalation(detectPriority(flair, title, description), {
            roomPrevious: prior.length,
            campusPrevious: campusPrior.length,
            flairLabel: flairById[flair].label,
        });

        const updates = [{ status: "Reported", comment: "Complaint submitted.", by: "System", at: createdAt }];
        let resolution = null;
        let t = createdAt.getTime();

        if (finalStatus !== "Reported") {
            t += 3 * HOUR;
            updates.push({ status: "In Progress", comment: "Maintenance team is looking into it.", by: "Admin", at: new Date(t) });
        }
        if (finalStatus === "Escalated") {
            t += 20 * HOUR;
            updates.push({ status: "Escalated", comment: "Needs a vendor visit — escalated to the administration office.", by: "Admin", at: new Date(t) });
        }
        if (finalStatus === "Resolved") {
            t += (6 + Math.floor(rand() * 40)) * HOUR;
            const resolvedAt = new Date(Math.min(t, now - HOUR));
            resolution = { note: "Issue fixed and verified.", afterPhoto: null, resolvedAt };
            updates.push({ status: "Resolved", comment: "Issue fixed and verified.", by: "Admin", at: resolvedAt });
        }

        const doc = new Complaint({
            ticketNo: `MT-${await nextSequence("complaint")}`,
            flair,
            flairGroup: flairById[flair].group,
            location: { ...location, spot: null },
            title,
            description,
            photos: [{ url: `https://placehold.co/800x600?text=${encodeURIComponent(title)}`, name: "photo.jpg" }],
            priority: detected.priority,
            prioritySource: detected.source,
            detectedPriority: detected.priority,
            basePriority: detected.basePriority,
            repeatBoost: detected.repeatBoost,
            matchedKeywords: detected.matchedKeywords,
            status: finalStatus,
            reportedBy: reporter._id,
            reporterType: rand() > 0.8 ? "Teacher" : "Student",
            reporterDepartment: ["comp", "it", "ece", "cse"][Math.floor(rand() * 4)],
            isRecurring: prior.length > 0,
            recurrenceCount: prior.length,
            updates,
            resolution,
        });

        const err = doc.validateSync();
        if (err) throw err;

        // Raw insert so the back-dated createdAt is kept (Mongoose would overwrite it)
        const raw = doc.toObject();
        raw.createdAt = createdAt;
        raw.updatedAt = updates[updates.length - 1].at;
        await Complaint.collection.insertOne(raw);

        created.push({ ...raw });
    }

    console.log(`Created ${created.length} complaints reported by ${reporter.email}`);
    console.log("Demo: report 'switchboard sparking' in Main Building > Computer Engineering Labs > Network Lab (Comp) with the Electrical Hazard flair.");
    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error("Seed failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
});
