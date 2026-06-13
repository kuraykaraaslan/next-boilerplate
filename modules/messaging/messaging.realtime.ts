import { z } from 'zod';
import redis from '@/modules/redis';
import { SafeMessageSchema, SafeParticipantSchema } from './messaging.types';
import { MessageModerationStatusEnum } from './messaging.enums';

/**
 * Shared realtime contract between the Next.js HTTP process (publisher) and the
 * standalone Socket.IO service (subscriber). Kept dependency-light on purpose —
 * it imports only `@/modules/redis` + zod and is imported one-way by the
 * lifecycle service. It must NEVER import the services back (avoids a cycle).
 *
 * The HTTP process has no Socket.IO server, so it hands persisted events to the
 * WS cluster over a single Redis pub/sub channel; the WS subscriber routes each
 * payload to the right room. (This is a different hop from the redis-adapter,
 * which fans out socket↔socket *within* the WS cluster.)
 */

// Single global channel; tenant + conversation live inside the payload.
export const RT_CHANNEL = 'msg:rt';

// ─── Room naming (used by the WS server) ─────────────────────────────────────

export const conversationRoom = (tenantId: string, conversationId: string): string =>
  `t:${tenantId}:c:${conversationId}`;

export const userRoom = (tenantId: string, userId: string): string =>
  `t:${tenantId}:u:${userId}`;

// ─── Payload schemas ─────────────────────────────────────────────────────────

export const RtMessageNewSchema = z.object({
  kind: z.literal('message:new'),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  clientNonce: z.string().optional(),
  message: SafeMessageSchema,
});

export const RtMessageDeletedSchema = z.object({
  kind: z.literal('message:deleted'),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
});

export const RtReadSchema = z.object({
  kind: z.literal('read'),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  upToMessageId: z.string().uuid(),
});

export const RtParticipantAddedSchema = z.object({
  kind: z.literal('participant:added'),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  participant: SafeParticipantSchema,
});

export const RtParticipantRemovedSchema = z.object({
  kind: z.literal('participant:removed'),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const RtMessageModeratedSchema = z.object({
  kind: z.literal('message:moderated'),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  status: MessageModerationStatusEnum,
  // When set, deliver to this user's room only (e.g. the sender's PENDING notice).
  forUserId: z.string().uuid().optional(),
});

export const RtEventSchema = z.discriminatedUnion('kind', [
  RtMessageNewSchema,
  RtMessageDeletedSchema,
  RtReadSchema,
  RtParticipantAddedSchema,
  RtParticipantRemovedSchema,
  RtMessageModeratedSchema,
]);
export type RtEvent = z.infer<typeof RtEventSchema>;

/**
 * Publish a realtime event for the WS cluster to fan out. Best-effort: a Redis
 * hiccup must never break the HTTP write that triggered it.
 */
export async function publishRealtime(event: RtEvent): Promise<void> {
  try {
    await redis.publish(RT_CHANNEL, JSON.stringify(event));
  } catch {
    // swallow — realtime is best-effort; the message is already persisted.
  }
}
