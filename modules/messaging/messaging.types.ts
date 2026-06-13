import { z } from 'zod';
import {
  ConversationTypeEnum,
  ParticipantRoleEnum,
  MessageContentTypeEnum,
  MessageModerationStatusEnum,
  ReportReasonEnum,
  ReportStatusEnum,
} from './messaging.enums';

// ─── Attachment ──────────────────────────────────────────────────────────────

export const AttachmentSchema = z.object({
  url: z.string().url(),
  name: z.string().max(255),
  mimeType: z.string().max(127),
  size: z.number().int().nonnegative(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

// ─── Conversation ────────────────────────────────────────────────────────────

export const ConversationSchema = z.object({
  conversationId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: ConversationTypeEnum,
  title: z.string().nullable(),
  createdByUserId: z.string().uuid(),
  dedupeKey: z.string().nullable(),
  lastMessageAt: z.date().nullable(),
  lastMessagePreview: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Safe view strips soft-delete bookkeeping + the internal dedupe key.
export const SafeConversationSchema = ConversationSchema.omit({ deletedAt: true, dedupeKey: true });
export type SafeConversation = z.infer<typeof SafeConversationSchema>;

// List item adds the viewer's unread count.
export const SafeConversationSummarySchema = SafeConversationSchema.extend({
  unreadCount: z.number().int().nonnegative(),
});
export type SafeConversationSummary = z.infer<typeof SafeConversationSummarySchema>;

// ─── Participant ─────────────────────────────────────────────────────────────

export const ParticipantSchema = z.object({
  participantId: z.string().uuid(),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: ParticipantRoleEnum,
  lastReadMessageId: z.string().uuid().nullable(),
  lastReadAt: z.date().nullable(),
  lastDeliveredMessageId: z.string().uuid().nullable(),
  mutedUntil: z.date().nullable(),
  joinedAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const SafeParticipantSchema = ParticipantSchema.omit({ deletedAt: true });
export type SafeParticipant = z.infer<typeof SafeParticipantSchema>;

// Conversation detail bundles its active participants.
export const SafeConversationDetailSchema = SafeConversationSchema.extend({
  participants: z.array(SafeParticipantSchema),
});
export type SafeConversationDetail = z.infer<typeof SafeConversationDetailSchema>;

// ─── Message ─────────────────────────────────────────────────────────────────

export const MessageSchema = z.object({
  messageId: z.string().uuid(),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderUserId: z.string().uuid(),
  body: z.string(),
  contentType: MessageContentTypeEnum,
  attachments: z.array(AttachmentSchema).nullable(),
  replyToMessageId: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  editedAt: z.date().nullable(),
  moderationStatus: MessageModerationStatusEnum,
  moderationReason: z.string().nullable(),
  moderationScore: z.number().int().nullable(),
  moderationLabels: z.array(z.string()).nullable(),
  moderatedByUserId: z.string().uuid().nullable(),
  moderatedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const SafeMessageSchema = MessageSchema.omit({ deletedAt: true });
export type SafeMessage = z.infer<typeof SafeMessageSchema>;

// ─── Message report ──────────────────────────────────────────────────────────

export const MessageReportSchema = z.object({
  messageReportId: z.string().uuid(),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  reporterUserId: z.string().uuid(),
  reason: ReportReasonEnum,
  note: z.string().nullable(),
  status: ReportStatusEnum,
  resolvedByUserId: z.string().uuid().nullable(),
  resolutionAction: z.string().nullable(),
  resolvedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const SafeMessageReportSchema = MessageReportSchema.omit({ deletedAt: true });
export type SafeMessageReport = z.infer<typeof SafeMessageReportSchema>;
