# Logger

- **id:** `logger`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/logger/`
- **tags:** infrastructure, core
- **icon:** `fas fa-file-lines`
- **hasNextLayer:** false

Winston-based structured logger. Use instead of console.* across the codebase.

## Dependencies

- **requires:** `env`

## Services

- `logger.service.ts`

## README

# Logger Module

Winston-based, framework-agnostic structured logging singleton. Use it instead of `console.*` across the codebase. Every log line is auto-tagged with the active tenant/user/request IDs carried through `AsyncLocalStorage`, so downstream code can log without threading context by hand.

---

## Exports

| Export | Kind | Description |
|---|---|---|
| `Logger` (default) | class | Static `info`, `error`, `warn`, `debug` log methods plus `runWithContext` / `getContext`. |
| `Logger` (named) | class | Same class, named re-export for convenience. |
| `LogContext` | interface | Per-request context shape (`tenantId?`, `userId?`, `requestId?`, plus arbitrary string/number/boolean keys). |

The module has **no entities, no API routes, and no settings** — it is pure shared infrastructure. Its only dependency is `env` (used to pick the transport).

---

## Responsibilities

- **Structured log lines.** Three process-wide Winston singletons (`infoLogger`, `errorLogger`, `warnLogger`, created by `makeLogger`) format each entry as `[<timestamp>] [<level>]<tags>: <message>` with a `MMM-DD-YYYY HH:mm:ss` timestamp.
- **Automatic context tagging.** `currentContext()` reads the active `LogContext` from an `AsyncLocalStorage` store; the formatter appends `[tenant=… user=… req=…]` for whichever IDs are present.
- **Argument serialization.** Extra args passed to `info/error/warn/debug` are serialized (`JSON.stringify` for objects, `String(...)` otherwise) and appended to the message.
- **Transport selection.** `makeTransports` writes to the **Console** when `env.NODE_ENV` is `vercel` or `development`; otherwise it writes to a daily file `logs/<YYYY-MM-DD>.log`.
- **`debug`** is emitted through the info logger with a `[DEBUG]` prefix (there is no separate debug transport/level).

---

## Context propagation

```ts
import Logger from '@/modules/logger';

// Wrap a request (typically in the proxy / route handler):
Logger.runWithContext({ tenantId, userId, requestId }, async () => {
  await doStuff(); // any Logger.* call inside is auto-tagged
});

// runWithContext merges over any already-active context.
const ctx = Logger.getContext(); // { tenantId, userId, requestId, ... }
```

---

## Usage

```ts
import Logger from '@/modules/logger';

Logger.info('User created', { userId });
Logger.error('DB failure', error);
Logger.warn('Quota near limit', { used, limit });
Logger.debug('Cache miss', { key });
```

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A Winston-based, framework-agnostic structured logging singleton that auto-tags every log line with the active tenant/user/request IDs via AsyncLocalStorage, but is pure shared infrastructure with no per-tenant settings, entities, or behavior branching.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Global log level and transport choice are fixed at module load (makeLogger('info'/'warn'/'error') singletons; transport switches only on env.NODE_ENV). A tenant cannot raise verbosity (e.g. enable debug) for their own traffic, even though tenantId is already carried in LogContext and stamped on each line. | `logger.service.ts: makeLogger / makeTransports / static infoLogger\|errorLogger\|warnLogger` | Mostly intentional shared infra — the loggers are process-wide static singletons writing to one console/file sink, so true per-tenant level routing would require restructuring (per-context level filtering rather than per-tenant logger instances). Listing it because tenant-scoped log verbosity is a plausible SaaS feature and the tenantId context already exists to gate it; not a simple settings read today. | `logLevel` |

---

## Dependencies

- `winston` — logging engine and transports.
- `node:async_hooks` (`AsyncLocalStorage`) — request-scoped context store.
- `@/modules/env` — `NODE_ENV` drives the console-vs-file transport choice.
