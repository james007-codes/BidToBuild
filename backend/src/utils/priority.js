import config, { flairById, PRIORITY_RANK } from "../config/complaintConfig.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Pre-compile whole-word / whole-phrase matchers, e.g. "fire" must not match "firewall"
const keywordMatchers = Object.entries(config.escalationKeywords).flatMap(
    ([level, words]) =>
        words.map((word) => ({
            level,
            word,
            regex: new RegExp(`\\b${escapeRegex(word.toLowerCase()).replace(/\s+/g, "\\s+")}\\b`, "i"),
        }))
);

/**
 * Priority = the higher of (flair default) and (highest escalation keyword matched).
 * Keywords can only RAISE priority, never lower it.
 */
export function detectPriority(flairId, ...texts) {
    const flair = flairById[flairId];
    if (!flair) return null;

    const text = texts.filter(Boolean).join(" ");

    const matched = keywordMatchers.filter((m) => m.regex.test(text));

    let keywordLevel = null;
    for (const m of matched) {
        if (keywordLevel === null || PRIORITY_RANK[m.level] > PRIORITY_RANK[keywordLevel]) {
            keywordLevel = m.level;
        }
    }

    const raised =
        keywordLevel !== null &&
        PRIORITY_RANK[keywordLevel] > PRIORITY_RANK[flair.defaultPriority];

    // Only report keywords at the winning level (e.g. "sparking", not also "stuck")
    const matchedKeywords = raised
        ? [...new Set(matched.filter((m) => m.level === keywordLevel).map((m) => m.word))]
        : [];

    return {
        priority: raised ? keywordLevel : flair.defaultPriority,
        source: raised ? "keyword" : "flair",
        flairDefault: flair.defaultPriority,
        matchedKeywords,
    };
}

const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Repeat escalation, applied on top of detectPriority():
 *   - same room + same flair within recurrenceWindowDays (config.repeatEscalation.sameRoom)
 *   - same flair anywhere on campus within campusWide.windowDays
 * Boosts add up, only ever raise, and are capped at the highest priority.
 *
 * roomPrevious / campusPrevious = number of EARLIER complaints (not counting this one).
 */
export function applyRepeatEscalation(detected, { roomPrevious = 0, campusPrevious = 0, flairLabel = "this issue" } = {}) {
    const rules = config.repeatEscalation || {};
    const reasons = [];

    let room = 0;
    for (const rule of rules.sameRoom || []) {
        if (roomPrevious >= rule.minPrevious) room = Math.max(room, rule.raiseBy);
    }
    if (room) {
        reasons.push(
            `${ordinal(roomPrevious + 1)} report of ${flairLabel} in this room in ${config.recurrenceWindowDays} days (+${room})`
        );
    }

    const campus = rules.campusWide && campusPrevious >= rules.campusWide.minPrevious ? rules.campusWide.raiseBy : 0;
    if (campus) {
        reasons.push(
            `${campusPrevious + 1} ${flairLabel} reports across campus in ${rules.campusWide.windowDays} days (+${campus})`
        );
    }

    const maxRank = config.priorities.length - 1;
    const baseRank = PRIORITY_RANK[detected.priority];
    const finalRank = Math.min(maxRank, baseRank + room + campus);
    const raised = finalRank > baseRank;

    return {
        ...detected,
        basePriority: detected.priority,
        priority: config.priorities[finalRank],
        source: raised ? "repeat" : detected.source,
        repeatBoost: raised ? { room, campus, reasons } : { room: 0, campus: 0, reasons: [] },
    };
}
