# Complaint Management API

Base URL: `http://localhost:5000/api`. Every endpoint needs `Authorization: Bearer <token>`.
All responses include `success: true|false`; errors also include `message`.
Single source of truth for flairs, keywords and locations: `src/config/complaintConfig.json`
(also served at `GET /complaints/config`).

## Priority & recurrence rules
- **Priority** = the higher of the flair's `defaultPriority` and the highest escalation keyword
  found in title + description. Keywords only raise, never lower. The server always recomputes on create.
- **prioritySource**: `flair` | `keyword` | `admin` (after an override).
- **Recurring**: an earlier complaint exists with the same room + flair within `recurrenceWindowDays` (30).
- **Workflow**: Reported → Assigned (via assign) → In Progress → Resolved (via resolve).

## User (role "user")
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | /complaints/config | – | `{ config }` |
| POST | /complaints/preview | JSON `{ flair, title, description, buildingId?, floorId?, roomId? }` | `{ priority, source, flairDefault, matchedKeywords, recurrencePreview: { isRecurring, count, windowDays } }` |
| POST | /complaints | **multipart**: `flair, title, description, buildingId, floorId, roomId, spot?, reporterType? ("Student"/"Faculty")`, files `photos` (1–3, JPG/PNG/WEBP, ≤5 MB each) | `201 { complaint }` |
| GET | /complaints/mine?status=&flair= | – | `{ complaints: Complaint[] }` |
| GET | /complaints/:id | – | `{ complaint }` (owner only; `recurrence.history` is empty for users) |

## Admin (role "admin")
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | /admin/complaints?status=&priority=&flair=&buildingId=&roomId=&roomType=&recurring=true&workerId=&search=&sort=priority\|newest\|oldest&page=1&limit=20 | – | `{ items: Complaint[], total, page, limit }`. Default sort: open first, then Critical→Low, then newest |
| GET | /admin/complaints/:id | – | `{ complaint }` with full `recurrence.history` |
| POST | /admin/complaints/:id/assign | `{ workerId }` | `{ complaint, warning: string\|null }` (warning when the worker has 5+ active tasks) |
| POST | /admin/complaints/:id/updates | `{ status, comment }` | `{ complaint }`. Allowed: Assigned→In Progress, or the same status + comment (progress note) |
| PATCH | /admin/complaints/:id/priority | `{ priority, reason }` | `{ complaint }` |
| POST | /admin/complaints/:id/resolve | **multipart**: `note`, file `afterPhoto?` | `{ complaint }` (only from In Progress) |
| GET | /admin/workers?flair= | – | `{ workers: Worker[] }`. With `flair`: only skilled workers, sorted by lowest load (for the assign dropdown) |
| POST | /admin/workers | `{ name, phone?, skills: groupId[], status? }` | `201 { worker }` |
| GET | /admin/stats?range=7d\|30d\|all | – | Stats (top-level keys below) |

## Shapes
```js
Complaint {
  id, ticketNo: "MT-1042", flair, flairGroup,
  location: { buildingId, building, floorId, floor, roomId, roomName, roomType, spot },
  title, description, photos: [{ url, name }],
  priority, prioritySource, matchedKeywords: [], detectedPriority, priorityOverrideReason,
  status, reportedBy: { id, name, email, type }, assignedWorker: { id, name } | null,
  recurrence: { isRecurring, count, windowDays, history: [{ id, ticketNo, title, status, createdAt, resolvedAt }] },
  updates: [{ id, status, comment, by, at }],
  resolution: { note, afterPhoto: { url, name } | null, resolvedAt } | null,
  createdAt, updatedAt
}
// In list endpoints, recurrence = { isRecurring, count, windowDays: null, history: [] } (snapshot at creation)

Worker { id, name, phone, skills, status, activeCount, resolvedThisWeek,
         byPriority: { Low, Medium, High, Critical }, overloaded }

Stats {
  range,
  kpis: { total, open, criticalOpen, resolvedThisWeek, avgResolutionHours, recurringCount },
  byStatus: [{ status, count }], byPriority: [{ priority, count }],
  byFlair: [{ flair, label, color, count }], byFlairGroup: [{ group, label, count }],
  byRoomType: [{ roomType, count }], byBuilding: [{ building, count, open, critical }],
  topRooms: [{ roomId, roomName, roomType, building, count, open }],
  roomFlairMatrix: [{ roomId, roomName, flair, label, count }],
  hotspots: [{ roomId, roomName, roomType, building, flair, label, count }],
  trend: [{ date: "YYYY-MM-DD", count }]
}
```

## Demo data
```bash
# register one normal user in the app first, then:
npm run seed            # or: node src/scripts/seed.js --reset
```
Creates 8 workers and ~40 complaints. LH-204 (B Block, 2nd Floor) already has 2 electrical hazard
reports this month, so a new "switchboard sparking" report shows as Critical + 3rd recurrence.
