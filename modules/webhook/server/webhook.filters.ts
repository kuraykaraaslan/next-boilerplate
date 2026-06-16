import { Webhook as WebhookEntity } from './entities/webhook.entity';
import type { WebhookEvent } from './webhook.enums';

/**
 * Evaluate a webhook's optional per-event filter against the event payload.
 * A webhook with no filter for the event always passes; otherwise every
 * `dot.path: value` condition in `eventFilters[event]` must match (AND).
 */
export function passesEventFilter(
  webhook: WebhookEntity,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): boolean {
  const filter = webhook.eventFilters?.[event];
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [path, expected] of Object.entries(filter)) {
    if (!looseEquals(readPath(payload, path), expected)) return false;
  }
  return true;
}

/** Read a dot-delimited path out of a nested payload, or undefined if absent. */
function readPath(payload: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc != null && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
    payload,
  );
}

/** Lenient equality: exact, deep-by-JSON for objects, else string-coerced for primitives. */
function looseEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return String(a) === String(b);
}
