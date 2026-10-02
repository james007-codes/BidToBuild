# AI Chat App — Frontend Build Spec (Boilerplate)

**How to use this file:** Fill in §0, then hand the whole document to an LLM with a
prompt like *"Build a React frontend for this app following this spec exactly."*
Everything from §1 onward is the fixed backend contract — it does not change
between projects. Only §0 changes.

---

## 0. Project variables — FILL THIS IN

| Variable            | Value                                                    |
| ------------------- | -------------------------------------------------------- |
| `APP_NAME`          | *e.g. ZIA*                                                |
| `APP_TAGLINE`       | *e.g. AI-powered healthcare assistant*                    |
| `APP_FULL_NAME`     | *e.g. ZIA — Zero Interface AI* (footer text)              |
| `DOMAIN`            | *e.g. healthcare / legal / finance / education*           |
| `ASSISTANT_PURPOSE` | *one line: what the assistant helps the user do*          |
| `EMPTY_STATE_COPY`  | *e.g. "Ask me a question about X and I'll help."*         |
| `INPUT_PLACEHOLDER` | *e.g. "Ask {APP_NAME} something..."*                      |
| `API_BASE_URL`      | `http://localhost:5000/api`                               |
| `ACCENT_PALETTE`    | *e.g. Tailwind `slate` — see §7*                          |

Everything below refers to these by name. The backend contract is
**domain-agnostic**: it moves conversations and messages, and never inspects the
subject matter. Any topic works without backend changes.

---

## 1. Conventions

```js
const API_BASE_URL = "<API_BASE_URL>";
```

- All requests and responses are JSON (`Content-Type: application/json`).
- Errors return a non-2xx status with a `message` field:
  ```json
  { "message": "Invalid credentials" }
  ```
- Every service function follows the same shape:
  ```js
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "<fallback>");
  return data.<envelopeKey>;
  ```
- **Architectural rule:** all `fetch` calls live in a service layer
  (`services/authService.js`, `services/aiService.js`). Components never call
  `fetch` directly and never see response envelopes.

---

## 2. Auth — two parallel identities

The backend exposes **two separate account systems**, `user` and `admin`, with
mirrored endpoints. There is no single endpoint that logs in and detects the role;
the frontend picks the endpoint from a UI toggle.

| Action   | Role  | Method | Path                   |
| -------- | ----- | ------ | ---------------------- |
| Login    | user  | POST   | `/auth/login`          |
| Login    | admin | POST   | `/auth/admin/login`    |
| Register | user  | POST   | `/auth/register`       |
| Register | admin | POST   | `/auth/admin/register` |

**Login body:** `{ email, password }`
**Register body:** `{ name, email, password }`

### 2.1 The response-key trap

The account object key differs by role. This is the single most common source of
bugs when rebuilding this frontend.

```json
// user endpoints
{ "token": "<jwt>", "user":  { "_id": "...", "name": "...", "email": "..." } }

// admin endpoints
{ "token": "<jwt>", "admin": { "_id": "...", "name": "...", "email": "..." } }
```

Normalise immediately at the call site so the rest of the app sees one shape:

```js
const account = role === "admin"
  ? { ...data.admin, role: "admin" }
  : { ...data.user,  role: "user"  };
```

Auth endpoints take **no** `Authorization` header.

---

## 3. Session persistence

Three `localStorage` keys, nothing else:

| Key     | Value                                                    |
| ------- | -------------------------------------------------------- |
| `token` | Raw JWT string — **no** `Bearer ` prefix stored           |
| `user`  | `JSON.stringify()` of `data.user` **or** `data.admin`     |
| `role`  | `"user"` or `"admin"`                                     |

- Written on successful login **and** register — registration auto-authenticates,
  there is no separate "now log in" step.
- Logout clears all three; there is no server-side logout endpoint.
- On app boot, read these three to restore the session.

Expose helpers: `getToken()`, `getStoredUser()`, `getRole()`, `logout()`.

---

## 4. Conversations & AI

Conversation CRUD sits at the **top level**. Only the completion call is
namespaced under `/ai`.

| Function                  | Method | Path                          | Body                          |
| ------------------------- | ------ | ----------------------------- | ----------------------------- |
| `getConversations`        | GET    | `/conversations`              | —                             |
| `createConversation`      | POST   | `/conversations`              | **none** — headers only       |
| `getConversationMessages` | GET    | `/conversations/:id/messages` | —                             |
| `sendAIMessage`           | POST   | `/ai/chat`                    | `{ message, conversationId }` |

`createConversation` sends no body — no title, no seed message. The backend
creates the empty conversation itself.

### 4.1 Auth header

Every call in this section carries the JWT; the `Bearer ` prefix is added here,
not in storage.

```js
const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});
```

### 4.2 Response envelopes

Each response is wrapped in a named key. The service layer unwraps it. Getting
this wrong renders empty screens with no error.

| Endpoint                          | Server returns               | Service returns |
| --------------------------------- | ---------------------------- | --------------- |
| `GET /conversations`              | `{ "conversations": [...] }` | the array       |
| `POST /conversations`             | `{ "conversation": {...} }`  | the object      |
| `GET /conversations/:id/messages` | `{ "messages": [...] }`      | the array       |
| `POST /ai/chat`                   | `{ "response": "..." }`      | a **string**    |

Because `/ai/chat` returns plain text, the component wraps it into a message
object itself:

```js
const response = await sendAIMessage(trimmed, conversationId);
const aiMessage = { role: "assistant", content: response };
```

Error fallbacks in use: `"Failed to load conversations"`,
`"Failed to create conversation"`, `"Failed to load messages"`,
`"AI request failed"`.

### 4.3 Object shapes (read defensively)

Field naming is not fully pinned down server-side, so read with fallbacks:

```js
const id    = conversation._id   || conversation.id;
const title = conversation.title || conversation.name || "New Conversation";
const text  = message.content || message.message || message.text || "";
```

A message has `role: "user" | "assistant"` and a text field. `role` is compared
strictly against `"user"`; anything else renders as the assistant.

---

## 5. Required behaviour

**On mount:**
1. `getConversations()`.
2. Non-empty → auto-select `[0]` and load its messages.
3. Empty → immediately `createConversation()`. The user must never see the chat
   screen without an active conversation.

**Sending a message:**
1. Trim; bail if empty, if already loading, or if no conversation is selected.
2. Optimistically append `{ role: "user", content: trimmed }`.
3. Clear input; set loading (typing indicator appears).
4. `await sendAIMessage(trimmed, conversationId)`.
5. Append the assistant message.
6. On failure, show the error banner. *(Known gap: the optimistic user message is
   not rolled back. Fix this if building fresh.)*

**Client-side register validation:** passwords match; length ≥ 6. Assume the
backend re-validates.

**State:** local component state is sufficient — no Redux/Context required. The
chat screen owns `conversations`, `currentConversation`, `messages`, `input`,
`loading`, `loadingMessages`, `error`.

---

## 6. Screens

Three components plus two services:

```
components/Login.jsx
components/Register.jsx
components/AIAssistant.jsx
services/authService.js
services/aiService.js
```

The parent holds the authenticated account and swaps between them, passing
`onLogin`, `onRegister`, `onBackToLogin`, `onLogout` callbacks.

---

## 7. UI reference

Tailwind CSS, single-hue neutral palette (`ACCENT_PALETTE`, default `slate`).
Substitute the hue to rebrand without touching layout.

**Auth screens** — centred `max-w-md` card on `bg-slate-50`. Brand block above the
card: `APP_NAME` as `text-4xl font-bold`, `APP_TAGLINE` beneath it. Card is white,
`rounded-2xl shadow-lg border`, `p-8`. Inside: heading, sub-line, then a two-button
segmented **User / Admin** toggle in a `bg-slate-100 p-1 rounded-lg` pill (active
button `bg-white shadow`, inactive `text-slate-500`). Error banner
`bg-red-50 border-red-200 text-red-600`. Inputs are `rounded-lg border px-4 py-3`
with `focus:ring-2`. Submit button is full-width `bg-slate-900 text-white`, labelled
by role — `Login as Admin`, `Register as User` — and shows `"Logging in..."` /
`"Creating account..."` while loading. Footer line: `APP_FULL_NAME`.

**Chat screen** — fixed `h-screen`, two panes, `overflow-hidden`.
*Sidebar* (`w-72`, `bg-slate-900`, white text): brand header, full-width
"+ New Conversation" button, scrollable conversation list (active item
`bg-slate-700`, others `hover:bg-slate-800`), and a bottom block with the account
name/email, capitalised role, and a bordered Logout button.
*Main*: white header showing the current conversation title and a one-line
subtitle derived from `ASSISTANT_PURPOSE`; scrollable message area; sticky input
bar with `INPUT_PLACEHOLDER` and a Send button disabled when loading, empty, or
without a conversation.

**Messages** — `max-w-4xl mx-auto`, `space-y-5`. User right-aligned
`bg-slate-900 text-white`; assistant left-aligned white with border. Both
`max-w-[75%] rounded-2xl px-5 py-3`, text `whitespace-pre-wrap leading-6`.
Loading indicator: three `animate-bounce` dots with 150ms/300ms delays.

**Empty state** — circular avatar with the first letter of `APP_NAME`, a
"How can I help you?" heading, and `EMPTY_STATE_COPY` beneath.

---

## 8. Known gaps

Carry these forward or fix them in a rebuild:

1. No 401 interceptor or token refresh — an expired token surfaces as a generic
   red banner.
2. Optimistic user message is not rolled back on send failure.
3. `admin` unlocks nothing — both roles get an identical UI, and no endpoint in
   this spec branches on role after login. Either build the admin surface or drop
   the second identity.
4. Conversation titles are never sent by the client, so they must be generated
   server-side or they stay absent.
