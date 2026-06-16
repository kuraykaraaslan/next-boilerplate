import redis from '@nb/redis';
import { tenantKey } from '@nb/redis';

/**
 * Ephemeral presence + typing state, stored only in Redis (never persisted to
 * the database). Presence is a per-user TTL key refreshed by a heartbeat; a user
 * is "online" while the key exists. Typing is an even shorter self-expiring key
 * so a dropped `typing:stop` heals on its own.
 */

const PRESENCE_TTL_SECONDS = 30;
const TYPING_TTL_SECONDS = 6;

const presenceKey = (tenantId: string, userId: string): string =>
  tenantKey(tenantId, 'msg', 'presence', userId);

const typingKey = (tenantId: string, conversationId: string, userId: string): string =>
  tenantKey(tenantId, 'msg', 'typing', conversationId, userId);

/** Mark a user online (called on connect and on each heartbeat). */
export async function touchPresence(tenantId: string, userId: string): Promise<void> {
  try {
    await redis.set(presenceKey(tenantId, userId), Date.now().toString(), 'EX', PRESENCE_TTL_SECONDS);
  } catch {
    /* best-effort */
  }
}

/** Clear presence on disconnect (last device). */
export async function clearPresence(tenantId: string, userId: string): Promise<void> {
  try {
    await redis.del(presenceKey(tenantId, userId));
  } catch {
    /* best-effort */
  }
}

/** Bulk presence lookup for a set of users (conversation list). */
export async function arePresent(tenantId: string, userIds: string[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  if (userIds.length === 0) return out;
  try {
    const vals = await redis.mget(...userIds.map((u) => presenceKey(tenantId, u)));
    userIds.forEach((u, i) => {
      out[u] = vals[i] != null;
    });
  } catch {
    userIds.forEach((u) => {
      out[u] = false;
    });
  }
  return out;
}

/** Record a short-lived typing marker (self-heals if `typing:stop` is lost). */
export async function setTyping(tenantId: string, conversationId: string, userId: string): Promise<void> {
  try {
    await redis.set(typingKey(tenantId, conversationId, userId), '1', 'EX', TYPING_TTL_SECONDS);
  } catch {
    /* best-effort */
  }
}

export async function clearTyping(tenantId: string, conversationId: string, userId: string): Promise<void> {
  try {
    await redis.del(typingKey(tenantId, conversationId, userId));
  } catch {
    /* best-effort */
  }
}

export const PRESENCE_HEARTBEAT_MS = 15_000;
