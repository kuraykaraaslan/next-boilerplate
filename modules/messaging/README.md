# Messaging

Tenant-scoped real-time messaging: 1-1 and group conversations, persisted
messages (soft-delete), read/delivery cursors, typing indicators, online/offline
presence, and participant roles (`owner` / `admin` / `member`).

## Architecture

**HTTP writes, WebSocket receives. Redis is the bridge.**

- **Writes** (send message, mark read, manage participants) go through the
  Next.js API routes under `app/tenant/[tenantId]/api/conversations/…`. They
  reuse the existing session auth, Zod validation, rate limiting and per-tenant
  DataSource, then **publish** a realtime event to Redis (`msg:rt` channel).
- **Realtime delivery** happens through a **standalone Socket.IO process**
  (`modules/messaging/server/`), run separately from Next.js (App Router cannot
  host a long-lived WS server). It subscribes to `msg:rt` and emits into rooms.
- Clients send only **typing / presence / read** signals over the socket; the
  message body itself is always an HTTP POST.

```
browser ──POST /messages──▶ Next API ──persist──▶ Postgres
                               │
                               └─publish msg:rt──▶ Redis ──▶ WS service ──emit──▶ browser(s)
browser ──typing/read────────────────────────────▶ WS service ──broadcast──▶ browser(s)
```

Two Redis mechanisms, different hops:
- `@socket.io/redis-adapter` — socket↔socket fan-out *within* the WS cluster.
- `msg:rt` pub/sub — Next HTTP process → WS cluster handoff of persisted events.

## WebSocket auth (short-lived single-use ticket)

1. `POST /tenant/{tenantId}/api/messaging/ws-ticket` (session-authed) → `{ ticket, expiresIn, wsUrl }`.
2. `io(wsUrl, { auth: { ticket }, transports: ['websocket'] })`.
3. The WS service consumes the ticket atomically (`GETDEL`, 30s TTL, single-use)
   and binds `{ userId, tenantId }` to the socket. Replays are rejected.

## Entities

- `conversations` — direct (1-1, deduped via `dedupeKey`) or group threads.
- `conversation_participants` — membership + role + read/delivery **cursors**
  (`lastReadMessageId` / `lastDeliveredMessageId`); receipts are watermarks, not
  per-message rows.
- `messages` — persisted messages, soft-deleted, cursor-paginated.

## Running

```bash
npm run dev        # Next.js app (HTTP API)
npm run ws:dev     # standalone Socket.IO service (watch mode)
# production: npm run build && npm run start  +  npm run ws:start
```

Env: `MESSAGING_WS_PORT` (default 4001), `MESSAGING_WS_PUBLIC_URL`,
`MESSAGING_WS_CORS_ORIGIN`. The WS service shares the same `.env`, Redis and DB
as the app.

> **Production note:** `synchronize` only creates tables in development. For
> production add a migration under `modules/db/migrations/` for the three tables
> and the **partial unique index** on `conversations(tenantId, dedupeKey)`.
> Socket.IO across multiple instances needs sticky sessions or (as configured
> here) `transports: ['websocket']`.

## Moderation

Per-tenant content moderation with three enforcement modes plus user reports and manual review.

**Policy** (`messagingModerationMode` setting): `OFF` | `LOG` | `REPORT` | `AUTO`.
- **OFF** — no scanning.
- **LOG** — violations are delivered but written to the moderation log (AuditLog `message.flagged`).
- **REPORT** — like LOG, plus surfaced in the moderator queue + admins notified.
- **AUTO** — **pre-delivery quarantine**: a violating message is held (`PENDING`, not delivered) until a
  moderator approves (delivered late) or rejects it.

**Detection** = keyword blocklist first (synchronous, deterministic), then an optional async AI (LLM)
backstop via `AIService` (BullMQ worker, requires `ENABLE_BACKGROUND_JOBS=true`). Keyword hits gate
delivery immediately; AI never blocks the send path (unless `messagingModerationAiHold=true` + AUTO).

**Status & visibility** (`Message.moderationStatus`): recipients see `CLEAN | FLAGGED | APPROVED`;
`PENDING | REJECTED | HIDDEN` are hidden from recipients (sender sees own with a marker, admins see all).

**Settings** (`SettingService`, ADMIN UI via the settings route): `messagingModerationMode`,
`messagingModerationKeywords` (JSON array of literals + `/regex/` entries), `messagingModerationUseAi`,
`messagingModerationAiHold`, `messagingModerationAiThreshold`, `messagingModerationReportThreshold`.

**User reports** are always available; `messagingModerationReportThreshold>0` auto-quarantines after N reports.

Moderation API (under `/tenant/[tenantId]/api/`):
```
POST   conversations/[conversationId]/messages/[messageId]/report   # any participant
GET    messaging/moderation/queue                                   # ADMIN — flagged/pending + open reports
POST   messaging/moderation/messages/[messageId]                    # ADMIN — { action: approve|reject|hide|dismiss }
GET/PUT messaging/moderation/settings                              # ADMIN — read/update policy
```
Realtime: a held message emits `message:moderated {status:'PENDING'}` to the sender only; on approve the
message is delivered late via `message:new`; on reject/hide recipients get `message:moderated` + `message:deleted`.

## Client sketch

```ts
const { ticket, wsUrl } = await fetch(`/tenant/${tenantId}/api/messaging/ws-ticket`, { method: 'POST' }).then(r => r.json());
const socket = io(wsUrl, { auth: { ticket }, transports: ['websocket'] });
socket.emit('join', { conversationId });
socket.on('message:new', (msg) => { /* render */ });
socket.emit('typing:start', { conversationId });
// send a message over HTTP:
await fetch(`/tenant/${tenantId}/api/conversations/${conversationId}/messages`, {
  method: 'POST', body: JSON.stringify({ body: 'hi' }),
});
```
