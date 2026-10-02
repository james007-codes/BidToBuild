# XIE CampusCare — Frontend ⇄ Backend ⇄ AI Service Contract

Hand this whole file to the AI building the frontend. Everything here matches the
backend that is already running. Do not invent endpoints, fields or statuses
that are not listed here.

---

## 0. What the app is

**XIE CampusCare** is the campus maintenance and predictive complaint management
platform for **Xavier Institute of Engineering (XIE), Mahim West, Mumbai**.

- **User** (role `"user"`): **students and teachers**. Each account picks
  `userType` (`"Student"` or `"Teacher"`) and a department once at sign-up. They report broken things on
  campus (a sparking switchboard, a broken fan, a leaking tap), attach photos and
  track the fix.
- **Admin** (role `"admin"`): the maintenance manager. They triage complaints,
  mark them In Progress or Escalated, post comments to the reporter, resolve,
  and watch analytics. **There are no workers/assignees in this system.**
- **Priority** is computed automatically from the issue type (the "flair") and
  from danger keywords in the text. It also detects **recurring** problems (same
  room and same issue within 30 days).

---

## 1. Architecture

```
Browser (frontend, Vite dev server, any localhost port)
   │  HTTP + JSON / multipart, JWT in Authorization header
   ▼
Backend  — Node/Express + MongoDB — http://localhost:5000/api
   │  internal HTTP (backend only)
   ▼
AI service — Python FastAPI + LangGraph — http://127.0.0.1:8000
```

**Rule: the frontend talks ONLY to the backend (`:5000`). It never calls the AI
service (`:8000`) directly.**

CORS: the backend accepts any `http://localhost:<port>` or
`http://127.0.0.1:<port>` origin.

---

## 2. Global conventions

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
```

- Requests are JSON (`Content-Type: application/json`) unless marked
  **multipart**. For multipart, send `FormData` and do NOT set Content-Type
  yourself.
- Every response includes `"success": true | false`.
- Errors are a non-2xx status plus `{ "success": false, "message": "Human readable reason" }`.
  Show `message` to the user.
- Status codes in use: 400 (validation), 401 (no, invalid or expired token),
  403 (wrong role), 404, 409 (duplicate email), 500.
- All protected endpoints need the header `Authorization: Bearer <token>`.
- IDs are MongoDB ObjectId strings. Dates are ISO 8601 strings.
- Put every `fetch` in a service layer (e.g. `services/apiClient.js`,
  `authService.js`, `complaintService.js`, `adminService.js`, `aiService.js`).
  Components never call `fetch` directly.
- On any **401** from a protected call, clear the session and send the user to
  login.

---

## 3. Auth (two separate account types)

There are two account systems with mirrored endpoints. The UI must have a
**User / Admin toggle** on login and register, because no endpoint auto-detects
the role. **No auth header** is sent on these four calls.

| Action   | Role  | Method | Path                    | Body                        |
|----------|-------|--------|-------------------------|-----------------------------|
| Register | user  | POST   | `/auth/register`        | `{ name, email, password, department }` |
| Login    | user  | POST   | `/auth/login`           | `{ email, password }`       |
| Register | admin | POST   | `/auth/admin/register`  | `{ name, email, password }` |
| Login    | admin | POST   | `/auth/admin/login`     | `{ email, password }`       |

### ⚠ Response key differs by role

```jsonc
// user endpoints  (register → 201, login → 200)
{ "success": true, "message": "...", "token": "<jwt>",
  "user":  { "id": "...", "name": "...", "email": "...", "userType": "Student" | "Teacher", "department": "comp" | null } }

// admin endpoints
{ "success": true, "message": "...", "token": "<jwt>",
  "admin": { "id": "...", "name": "...", "email": "..." } }
```

Normalise it right away:
```js
const account = role === "admin" ? { ...data.admin, role: "admin" } : { ...data.user, role: "user" };
```

- Registering also logs the person in. There is no separate "now log in" step.
- Errors: `401 "Invalid credentials"`, `409 "User already exists"` /
  `"Admin already exists"`, `400` for missing fields.
- Client validation: valid email, password ≥ 6 characters, and confirm-password
  must match.
- **User registration is XIE-only.** The email must end in an allowed domain from
  `config.emailDomains`, and the domain decides the type:
  - `@student.xavier.ac.in` → `userType: "Student"` (e.g. `202301099.name@student.xavier.ac.in`)
  - `@xavier.ac.in` → `userType: "Teacher"`
  - Any other email returns 400: "Please register with your XIE email (@student.xavier.ac.in or @xavier.ac.in)".
  - Don't ask for Student/Teacher. Show the type detected from the email instead,
    and check the domain on the client too.
  - Also send `department` (an id from `config.departments`, shown as a dropdown).
  - Admin registration has no domain restriction.

### Session persistence (localStorage)

| Key     | Value                                         |
|---------|-----------------------------------------------|
| `token` | raw JWT (no `Bearer ` prefix)                 |
| `user`  | `JSON.stringify(data.user)` or `data.admin`   |
| `role`  | `"user"` or `"admin"`                         |

Logout just clears these three keys. There is no logout endpoint.

### Restore session on app load

| Role  | Method | Path              | Response                                   |
|-------|--------|-------------------|--------------------------------------------|
| user  | GET    | `/users/profile`  | `{ success, user: { _id, name, email, userType, department, createdAt, updatedAt } }`  |
| admin | GET    | `/admin/profile`  | `{ success, admin: { _id, name, email, createdAt, updatedAt } }` |

⚠ Profile objects use **`_id`**, not `id`, so read `account._id || account.id`.
If the call returns 401, clear the session.

---

## 4. Shared configuration (single source of truth)

`GET /complaints/config` (auth required, any role) returns `{ success, config }`.
Load it once after login and use it for every dropdown, chip and label. Do not
hard-code these lists.

```jsonc
config = {
  "institution": { "name": "Xavier Institute of Engineering", "shortName": "XIE", "location": "Mahim West, Mumbai",
                   "address": "...", "email": "office@xavier.ac.in", "phone": "...", "website": "...",
                   "emergencyNote": "Move away from the area ... inform the security guard at the main entrance (24x7) or the General Office" },
  "emailDomains": { "student.xavier.ac.in": "Student", "xavier.ac.in": "Teacher" },
  "userTypes": ["Student", "Teacher"],
  "departments": [ { "id": "comp", "label": "Computer Engineering" }, { "id": "it", "label": "Information Technology" },
                   { "id": "ece", "label": "Electronics and Computer Engineering" },
                   { "id": "cse", "label": "Computer Science and Engineering" }, { "id": "other", "label": "Other / Administration" } ],
  "priorities": ["Low", "Medium", "High", "Critical"],
  "statuses":   ["Reported", "In Progress", "Escalated", "Resolved"],
  "recurrenceWindowDays": 30,
  "flairGroups": [ { "id": "electrical-safety", "label": "Electrical & Safety" }, ... ],
  "flairs": [
    { "id": "electrical-hazard", "label": "Electrical Hazard", "group": "electrical-safety",
      "icon": "Zap", "color": "#DC2626", "defaultPriority": "Critical", "handledBy": "Electrician" },
    ...
  ],
  "escalationKeywords": { "Critical": ["sparking", "smoke", ...], "High": ["no water", "cockroach", ...] },
  "roomTypes": ["Classroom", "Computer Lab", ...],
  "buildings": [
    { "id": "main", "name": "Main Building", "floors": [
        { "id": "cmpn-labs", "name": "Computer Engineering Labs", "rooms": [
            { "id": "cmpn-net", "name": "Network Lab (Comp)", "roomType": "Computer Lab" }, ... ] } ] },
    ...
  ]
}
```

Current values, for reference:

**Flair groups → flairs (default priority, lucide icon name)**
- Electrical & Safety: Electrical Hazard (Critical, Zap) · Fire Safety (Critical, Flame) · Power Outage (High, PlugZap) · Lights Not Working (Low, Lightbulb)
- Classroom Resources: Fan Not Working (Medium, Fan) · AC Not Working (Medium, AirVent) · Projector Issue (Medium, Projector) · Smart Board Not Working (Medium, Presentation) · Broken Bench / Chair (Low, Armchair)
- Labs & IT: Computer / Lab PC Issue (Medium, Monitor) · Wi-Fi & Network (Medium, Wifi) · Lab Equipment Fault (Medium, FlaskConical) · Printer Issue (Low, Printer) · Software / System Issue (Medium, AppWindow)
- Water & Washroom: Water Purifier / Cooler (High, GlassWater) · Plumbing / Tap Leak (Medium, Droplets) · Washroom Hygiene (Medium, Bath)
- Canteen: Canteen Hygiene (High, Bug) · Canteen Food Quality (Medium, UtensilsCrossed) · Canteen Equipment (Low, CookingPot)
- Campus: Lift Not Working (High, ArrowUpDown) · Structural Damage (High, Construction) · Door / Window Damage (Low, DoorOpen) · Library Issue (Low, Library) · Parking Issue (Low, CircleParking) · Cleanliness / Housekeeping (Low, Sparkles) · Intercom / CCTV (Medium, Cctv) · Garden / Playground (Low, Trees) · Other (Low, CircleHelp)

The `icon` values are **lucide-react** icon names. Each flair has its own
`color` (hex) and a `handledBy` string (e.g. "Electrician", "Lab Assistant /
System Administrator", "Lift maintenance (AMC)"). It's informational only, so
show it as "Usually handled by …". There is no assignment.

**Locations (XIE campus, 85 spots)**: the JSON keys are `buildings → floors →
rooms`, but at XIE they mean **Area → Section → Room**, so label the pickers
"Area", "Section" and "Room". There are two areas:
- **Main Building**, with these sections:
  - Classrooms & Tutorial Rooms
  - Computer Engineering Labs
  - IT Labs
  - Electronics & Computer Engg Labs
  - First Year (Applied Sciences) Labs
  - Computer Centre & Research
  - Library (1st Floor)
  - Offices
  - Halls, Common Rooms & Canteen
  - One "Corridor & Washrooms" section for each of the four floors (Ground to 3rd)
- **Campus Grounds**, with one section: Outdoor.

Real lab names come from xavier.ac.in.

**Room types**: Classroom, Tutorial Room, Computer Lab, Electronics Lab,
Science Lab, Workshop, Drawing Hall, Seminar Hall, Library, Office, Common Room,
Canteen, Washroom, Corridor, Outdoor.

**Critical safety banner**: show `institution.emergencyNote`, plus the General
Office phone and email from `institution`.

---

## 5. Business rules the UI must reflect

1. **Priority** is computed in three steps. Each step can only raise it, and it
   is capped at Critical:
   1. **Base** = the higher of the flair's `defaultPriority` and the highest
      escalation keyword found in the title + description.
   2. **Repeat in the same room** (`config.repeatEscalation.sameRoom`): if there
      are ≥ 2 earlier reports of the same flair in the same room within 30 days
      (this is the 3rd), add **+1 level**. With ≥ 4 earlier (5th or later), add **+2**.
   3. **Spike across campus** (`config.repeatEscalation.campusWide`): if there are
      ≥ 5 earlier reports of the same flair anywhere in the last 7 days, add
      **+1 level**.
   - Steps 2 and 3 add together. `basePriority` is the result of step 1, and
     `repeatBoost.reasons` explains steps 2 and 3, e.g. *"3rd report of Plumbing /
     Tap Leak in this room in 30 days (+1)"*.
   - `prioritySource`: `"flair"`, `"keyword"`, `"repeat"` (a repeat boost raised
     it) or `"admin"` (manually overridden).
   - The server always recomputes priority on create. The preview endpoint is for
     live UI feedback only.
2. **Recurring**: an earlier complaint exists for the **same room + same flair**
   within the last 30 days. `recurrence.count` is how many earlier complaints
   exist, so this complaint is report number `count + 1`.
3. **Status workflow**: `Reported → In Progress / Escalated → Resolved`.
   - The admin drives it directly. There are no workers or assignment.
   - Any open complaint (Reported, In Progress, Escalated) can move to **In
     Progress** or **Escalated** through **status update** (§7.3), with an
     optional comment. In Progress ⇄ Escalated both ways is allowed.
   - A **comment only** means posting the **same** status with a non-empty
     comment. The reporter sees it on their timeline.
   - Any open status → **Resolved** happens only through **resolve** (§7.5).
   - Nothing can go back to Reported, and Resolved is final.
   - UI stepper: show 3 steps, `Reported → In Progress → Resolved`. When the
     status is `Escalated`, the middle step reads "Escalated" in red.
4. **Priority colors**: Low = gray, Medium = blue, High = amber, Critical = red.
   Critical items should stand out (red accent, pulsing dot).
5. **Photos**: users must attach **1–3** images (JPG, PNG or WEBP, ≤ 5 MB each).
   The admin can attach **one** optional "after" photo when resolving.

---

## 6. User (student / faculty) endpoints — role `"user"`

### 6.1 Live priority preview — `POST /complaints/preview`
Call it while the user types (debounce ~600 ms). Nothing is saved.
```jsonc
// body
{ "flair": "electrical-hazard", "title": "...", "description": "...",
  "buildingId": "main", "floorId": "cmpn-labs", "roomId": "cmpn-net" }   // location optional
// 200
{ "success": true,
  "priority": "Critical",
  "source": "flair" | "keyword" | "repeat",
  "flairDefault": "Critical",
  "basePriority": "Critical",                       // before repeat boosts
  "matchedKeywords": ["sparking"],
  "repeatBoost": { "room": 1, "campus": 0, "reasons": ["3rd report of Electrical Hazard in this room in 30 days (+1)"] },
  "recurrencePreview": { "isRecurring": true, "count": 2, "windowDays": 30 } }
// 400 "A valid flair is required"
```
UI behaviour:
- If `source === "keyword"`, show *"Raised to Critical — matched: sparking"*.
- If `repeatBoost.reasons` isn't empty, list each one, e.g. *"Keeps happening: 3rd
  report of … (+1)"*.
- If the priority is Critical, show a red safety banner: *"This looks dangerous.
  Stay away from the area; maintenance has been alerted."*
- If recurring, show *"This issue has been reported 2 times in Network Lab (Comp) in the last
  30 days."*

### 6.2 Create complaint — `POST /complaints` (**multipart/form-data**)
Only accounts with role `"user"` can call this (admins get 403).

| Field          | Type   | Required | Notes                                          |
|----------------|--------|----------|------------------------------------------------|
| `flair`        | text   | yes      | a flair `id` from config                       |
| `title`        | text   | yes      |                                                |
| `description`  | text   | yes      |                                                |
| `buildingId`   | text   | yes      | from config                                    |
| `floorId`      | text   | yes      | from config                                    |
| `roomId`       | text   | yes      | from config                                    |
| `spot`         | text   | no       | free text, e.g. "third row, left side"         |
| `photos`       | file[] | yes      | 1–3 files, **field name `photos`** (append once per file) |

The reporter type and department are taken from the logged-in account. Don't
ask for them on the complaint form.
```jsonc
// 201
{ "success": true, "complaint": Complaint }
// 400 examples: "At least one photo is required", "A valid building, floor and room are required",
//               "Each image must be under 5 MB", "You can upload at most 3 photos",
//               "Only JPG, PNG or WEBP images are allowed"
```
After success, show the `ticketNo` (e.g. `MT-1042`), the final priority and a
"Track complaint" button.

### 6.3 My complaints — `GET /complaints/mine?status=&flair=`
Both query params are optional. Results are newest first.
```jsonc
{ "success": true, "complaints": Complaint[] }   // NOT paginated
```

### 6.4 One of my complaints — `GET /complaints/:id`
```jsonc
{ "success": true, "complaint": Complaint }   // 404 if not found or not the owner
```
For users, `recurrence.history` is always `[]` (privacy). Only the count is shown.

---

## 7. Admin endpoints — role `"admin"` (all return 403 for users)

### 7.1 List / queue — `GET /admin/complaints`
Query params (all optional):

| Param        | Values                                                       |
|--------------|--------------------------------------------------------------|
| `status`     | one of `statuses`                                            |
| `priority`   | one of `priorities`                                          |
| `flair`      | flair id                                                     |
| `buildingId` | building id                                                  |
| `roomId`     | room id                                                      |
| `roomType`   | one of `roomTypes`                                           |
| `recurring`  | `true`                                                       |
| `search`     | text: matches ticketNo, title, description, room name        |
| `sort`       | `priority` (default: open first, then Critical→Low, then newest) · `newest` · `oldest` |
| `page`       | default 1                                                    |
| `limit`      | default 20, max 100                                          |

```jsonc
{ "success": true, "items": Complaint[], "total": 57, "page": 1, "limit": 20 }
```
In list items, `recurrence = { isRecurring, count, windowDays: null, history: [] }`
(a snapshot taken at creation).

Poll every ~20 s to keep it live.

### 7.2 Detail — `GET /admin/complaints/:id`
```jsonc
{ "success": true, "complaint": Complaint }   // recurrence.history is filled here
```

### 7.3 Status update / comment — `POST /admin/complaints/:id/updates`
```jsonc
// body
{ "status": "In Progress" | "Escalated" | <current status>, "comment": "Electrician will check it at 3 pm" }
// 200
{ "success": true, "complaint": Complaint }
```
- **Change status**: `status` is `"In Progress"` or `"Escalated"` (different
  from the current one), from any open complaint. `comment` is optional.
- **Comment only**: `status` = the complaint's current status, with a non-empty
  `comment`.
- UI: three actions, **Comment**, **In progress** and **Escalate**, plus one
  comment box. Confirm before changing status.
- 400 messages: "Complaint is already resolved", "Use the resolve action to
  resolve a complaint", "Cannot move a complaint back to Reported", "Add a
  comment to post an update without changing status".

### 7.4 Override priority — `PATCH /admin/complaints/:id/priority`
```jsonc
// body
{ "priority": "High", "reason": "Exam hall, needed tomorrow" }   // reason required
// 200
{ "success": true, "complaint": Complaint }   // prioritySource becomes "admin"
```

### 7.5 Resolve — `POST /admin/complaints/:id/resolve` (**multipart**)
| Field        | Required | Notes                                  |
|--------------|----------|----------------------------------------|
| `note`       | yes      | what was fixed                         |
| `afterPhoto` | no       | one image, **field name `afterPhoto`** |

```jsonc
{ "success": true, "complaint": Complaint }   // from any open status; 400 if already resolved
```

### 7.6 Stats — `GET /admin/stats?range=7d|30d|all`
```jsonc
{ "success": true, "range": "30d", ...Stats }
```
Stats are computed live from the database on every call. Poll every ~20 s on
dashboards.

---

## 8. Data shapes

```ts
Complaint {
  id: string
  ticketNo: string                 // "MT-1042"
  flair: string                    // flair id
  flairGroup: string               // group id
  location: {
    buildingId, building,          // "main", "Main Building"              (Area)
    floorId, floor,                // "cmpn-labs", "Computer Engineering Labs"  (Section)
    roomId, roomName, roomType,    // "cmpn-net", "Network Lab (Comp)", "Computer Lab"
    spot: string | null
  }
  title: string
  description: string
  photos: { url: string, name: string }[]   // url is absolute, e.g. http://localhost:5000/uploads/abc.jpg
  priority: "Low" | "Medium" | "High" | "Critical"
  prioritySource: "flair" | "keyword" | "repeat" | "admin"
  basePriority: string              // flair + keywords, before repeat boosts
  repeatBoost: { room: number, campus: number, reasons: string[] }   // levels added + why
  matchedKeywords: string[]
  detectedPriority: string          // what the system computed before any admin override
  priorityOverrideReason: string | null
  status: "Reported" | "In Progress" | "Escalated" | "Resolved"
  reportedBy: { id, name, email, type: "Student" | "Teacher", department: { id, label } | null }
  recurrence: {
    isRecurring: boolean
    count: number                   // earlier reports (this one = count + 1)
    windowDays: number | null
    history: { id, ticketNo, title, status, createdAt, resolvedAt }[]   // admin detail only
  }
  updates: { id, status, comment, by: string, at: ISO }[]               // timeline, oldest first; by = admin name or "System"
  resolution: { note, afterPhoto: { url, name } | null, resolvedAt: ISO } | null
  createdAt: ISO
  updatedAt: ISO
}

Stats {
  range: "7d" | "30d" | "all"
  kpis: { total, open, criticalOpen, resolvedThisWeek,
          avgResolutionHours,       // 0 when nothing is resolved yet
          recurringCount }
  byStatus:     { status, count }[]               // all 4 statuses, in order
  byPriority:   { priority, count }[]             // all 4, Low→Critical
  byFlair:      { flair, label, color, count }[]  // sorted desc
  byFlairGroup: { group, label, count }[]
  byRoomType:   { roomType, count }[]
  byBuilding:   { building, count, open, critical }[]
  topRooms:     { roomId, roomName, roomType, building, count, open }[]   // top 10
  roomFlairMatrix: { roomId, roomName, flair, label, count }[]            // top 8 rooms × flair
  hotspots:     { roomId, roomName, roomType, building, flair, label, count }[]  // same room+flair ≥2
  byDepartment: { department, label, count }[]     // reporter's department; "unknown" → label "Not specified"
  byReporterType: { type: "Student" | "Teacher", count }[]
  trend:        { date: "YYYY-MM-DD", count }[]
}
```
⚠ `trend` only contains days that had complaints. Fill the missing days with 0
before drawing a line chart.

---

## 9. AI assistant chat (through the backend)

The assistant is a chat with saved conversations. Both roles can use it.

| Function                  | Method | Path                                         | Body                          | Returns (unwrap this)        |
|---------------------------|--------|----------------------------------------------|-------------------------------|------------------------------|
| list conversations        | GET    | `/conversations`                             | —                             | `data.conversations` (array) |
| create conversation       | POST   | `/conversations`                             | **no body**                   | `data.conversation`          |
| messages of conversation  | GET    | `/conversations/:conversationId/messages`    | —                             | `data.messages` (array)      |
| send message              | POST   | `/ai/chat`                                   | `{ message, conversationId }` | `data.response` (**string**) |

Shapes:
```jsonc
Conversation { "id", "title", "threadId", "createdAt", "updatedAt" }   // title is "New Conversation" until the
                                                                       // first message, then the first 100 chars of it
Message      { "_id", "conversation", "role": "user" | "assistant", "content", "createdAt", "updatedAt" }  // ⚠ _id
```
Behaviour:
- On open, load conversations. If there are none, create one, so the user never
  sees a chat without an active conversation.
- When sending: optimistically append `{ role: "user", content }`, show a typing
  indicator, then append `{ role: "assistant", content: data.response }`.
- If the send fails, roll back the optimistic message and show
  `"AI service unavailable"` (the backend returns 500 with that message when the
  AI service is down). Never crash.
- Render assistant messages as **Markdown** (e.g. `react-markdown`).
- Suggested starter chips: "What's the status of my latest complaint?", "How do I
  report an issue?", "What happens after I report?".
- Re-fetch the conversation list after the first reply so the title updates.

---

## 10. AI service (internal — for reference only, the frontend never calls it)

FastAPI on `http://127.0.0.1:8000`.

| Method | Path         | Body                                   | Response                 |
|--------|--------------|----------------------------------------|--------------------------|
| POST   | `/api/chat/` | `{ "message": str, "thread_id": str }` | `{ "response": str }`    |

- The backend's `/api/ai/chat` saves the user message, forwards
  `{ message, thread_id: conversation.threadId }`, saves the reply and returns
  `{ response }`.
- Memory is per `thread_id`, held in memory by a LangGraph checkpointer, so it
  resets when the AI service restarts. The backend keeps the permanent message
  history in MongoDB.
- **Current limitations (being worked on, don't design around them):** the AI
  service doesn't yet know which user is asking, and it can't read complaints.
  Its knowledge base and system prompt are still a placeholder from an older
  e-commerce project. The chat UI should work the same whatever text comes back.

---

## 11. Static files

Uploaded photos are served by the backend at `http://localhost:5000/uploads/<file>`.
Complaint `photos[].url` and `resolution.afterPhoto.url` are already absolute
URLs, so use them as-is in `<img src>`.

---

## 12. Screens the frontend must have

**User**
1. **Dashboard**: greeting, counts (reported / in progress / resolved), recent
   complaints, a "Report an issue" call to action, and an assistant shortcut.
2. **Report issue** (multi-step):
   1. Location: cascading Building → Floor → Room dropdowns, with a room-type tag
      and an optional "exact spot" field.
   2. Flair: a grouped picker using each flair's icon and color. Selecting one
      shows its default priority straight away.
   3. Details: title and description, with the live preview from §6.1.
   4. Photos: drag and drop, 1–3 images, thumbnails, remove button.
   5. Review and submit, then a success screen with the ticket number.
3. **My complaints**: a list filterable by status and flair.
4. **Complaint tracker**: details, photos (with a lightbox), the 3-step status
   stepper (§5.3), a "Latest from maintenance" card (the newest update whose
   `by` isn't "System"), the update timeline, and a resolution card (note +
   after photo) when resolved.
5. **Assistant**: the chat from §9.

**Admin**
1. **Dashboard**: KPIs, counts by status and priority, a pinned "Critical &
   not started" list (`GET /admin/complaints?priority=Critical&status=Reported`),
   recurring hotspots, and a trend chart. Live polling every 20 s.
2. **Complaints queue**: a searchable, filterable, sortable, paginated table
   (§7.1) with a priority badge (and a "raised" icon when `prioritySource ===
   "keyword"`), a recurring icon, last-updated time and the age.
3. **Complaint detail**:
   - The submission with photos.
   - Why it got its priority, e.g. *"Flair default: Medium → raised to Critical by
     keyword: sparking"*.
   - An override-priority action (reason required).
   - The recurrence history timeline, with a banner like *"Recurring issue — 3rd
     report in 30 days. Consider a permanent fix."*
   - An update panel: Comment / In progress / Escalate plus a comment box (§7.3).
   - A resolve panel (note + optional after photo).
   - The full update timeline.
   - Confirm dialogs for status changes and resolve.
4. **Locations**: building → floor → room breakdown, room-type filter chips,
   most-complained rooms, and a room side panel. Use `GET /admin/complaints`
   paged with `limit=100` and aggregate on the client, or use `Stats.topRooms` /
   `byBuilding` / `roomFlairMatrix`.
5. **Analytics**: charts for `byFlair`, `byFlairGroup`, `byRoomType`, `byDepartment`, `byReporterType`,
   `roomFlairMatrix` (stacked: what fails where), `byPriority`, `byStatus` and
   `trend`, with a 7d / 30d / all toggle.

**General**
- Responsive, with loading skeletons, empty states and error banners that show
  the backend's `message`.
- Navigation can be plain React state or a router. Either is fine.

---

## 13. Demo flow that must work

1. Register a user, then run `npm run seed` in `backend/`. This creates about 40
   demo complaints. Network Lab (Comp) already has 2 Electrical Hazard reports.
2. As the user: report Main Building → Computer Engineering Labs → Network Lab (Comp) with the Electrical Hazard flair, write
   "switchboard is sparking" and attach a photo. The preview shows Critical, the
   safety banner and "reported 2 times".
3. As the admin: it appears in "Critical & not started". Open it, see the
   recurrence history, mark it In Progress with a comment ("Electrician on the
   way"), optionally Escalate it, then resolve it with an after photo.
4. The user's tracker shows every step and the resolution.

---

## 14. Delivery requirements (so it can be merged back)

- Put the whole app in a folder named **`frontend/`**, with React + Vite and
  `npm run dev` / `npm run build`.
- Read the API URL from `VITE_API_BASE_URL`, falling back to
  `http://localhost:5000/api`.
- Don't commit `node_modules/`, `dist/` or `.env` files.
- Don't call the AI service directly, and don't add backend changes. If
  something is missing from this contract, list it in the README instead of
  inventing an endpoint.
