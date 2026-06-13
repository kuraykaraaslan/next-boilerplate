import { z } from 'zod';

// ─── Domain enums ────────────────────────────────────────────────────────────

export const ConversationTypeEnum = z.enum(['direct', 'group']);
export type ConversationType = z.infer<typeof ConversationTypeEnum>;

export const ParticipantRoleEnum = z.enum(['owner', 'admin', 'member']);
export type ParticipantRole = z.infer<typeof ParticipantRoleEnum>;

export const MessageContentTypeEnum = z.enum(['text', 'image', 'file', 'system']);
export type MessageContentType = z.infer<typeof MessageContentTypeEnum>;

export const DeliveryStatusEnum = z.enum(['sent', 'delivered', 'read']);
export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;

// ─── Moderation enums ────────────────────────────────────────────────────────

// Per-message moderation lifecycle. Visibility semantics below.
export const MessageModerationStatusEnum = z.enum([
  'CLEAN', // not flagged — visible to all
  'FLAGGED', // LOG/REPORT violation — delivered + visible, marked for moderators
  'PENDING', // AUTO quarantine — held, hidden from recipients, sender sees marker
  'APPROVED', // moderator cleared a flagged/pending message — visible to all
  'REJECTED', // moderator removed it — hidden from recipients
  'HIDDEN', // moderator hid an already-delivered message — hidden from recipients
]);
export type MessageModerationStatus = z.infer<typeof MessageModerationStatusEnum>;

// Statuses a non-sender, non-admin recipient is allowed to see.
export const RECIPIENT_VISIBLE_STATUSES: readonly MessageModerationStatus[] = [
  'CLEAN',
  'FLAGGED',
  'APPROVED',
] as const;

// Per-tenant moderation enforcement policy.
export const ModerationModeEnum = z.enum(['OFF', 'LOG', 'REPORT', 'AUTO']);
export type ModerationMode = z.infer<typeof ModerationModeEnum>;

// What detector / actor produced a moderation decision.
export const ModerationReasonEnum = z.enum(['keyword', 'ai', 'report', 'manual']);
export type ModerationReason = z.infer<typeof ModerationReasonEnum>;

// User-report reasons.
export const ReportReasonEnum = z.enum([
  'spam',
  'harassment',
  'hate',
  'sexual',
  'violence',
  'self_harm',
  'other',
]);
export type ReportReason = z.infer<typeof ReportReasonEnum>;

// Lifecycle of a user report.
export const ReportStatusEnum = z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']);
export type ReportStatus = z.infer<typeof ReportStatusEnum>;

// Manual moderator actions.
export const ModerationActionEnum = z.enum(['approve', 'reject', 'hide', 'dismiss']);
export type ModerationAction = z.infer<typeof ModerationActionEnum>;

// Role hierarchy for conversation-scoped authorization (higher index = more power).
export const PARTICIPANT_ROLE_RANK: Record<ParticipantRole, number> = {
  member: 0,
  admin: 1,
  owner: 2,
};

// ─── WebSocket event names (shared contract between WS server and clients) ───

export const WS_EVENTS = {
  // server → client
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_MODERATED: 'message:moderated',
  READ: 'read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE: 'presence',
  PARTICIPANT_ADDED: 'participant:added',
  PARTICIPANT_REMOVED: 'participant:removed',
  ERROR: 'error',
  // client → server
  JOIN: 'join',
  LEAVE: 'leave',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
