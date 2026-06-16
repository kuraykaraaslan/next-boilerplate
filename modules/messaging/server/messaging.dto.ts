import { z } from 'zod';
import {
  ConversationTypeEnum,
  ParticipantRoleEnum,
  MessageContentTypeEnum,
  ReportReasonEnum,
  ModerationActionEnum,
  ReportStatusEnum,
} from './messaging.enums';
import { AttachmentSchema } from './messaging.types';
import { MESSAGING_MODERATION_KEYS } from './messaging.moderation.setting.keys';

// ─── Conversations ───────────────────────────────────────────────────────────

export const CreateConversationDTO = z
  .object({
    type: ConversationTypeEnum,
    title: z.string().min(1).max(200).optional(),
    // The OTHER participants (the actor is added as owner automatically).
    participantUserIds: z.array(z.string().uuid()).min(1).max(256),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((v) => v.type !== 'direct' || v.participantUserIds.length === 1, {
    message: 'A direct conversation requires exactly one other participant.',
    path: ['participantUserIds'],
  })
  .refine((v) => v.type !== 'group' || !!v.title, {
    message: 'A group conversation requires a title.',
    path: ['title'],
  });
export type CreateConversationInput = z.infer<typeof CreateConversationDTO>;

export const ListConversationsDTO = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListConversationsInput = z.infer<typeof ListConversationsDTO>;

// ─── Messages ────────────────────────────────────────────────────────────────

export const SendMessageDTO = z.object({
  body: z.string().min(1).max(8000),
  contentType: MessageContentTypeEnum.default('text'),
  attachments: z.array(AttachmentSchema).max(10).optional(),
  replyToMessageId: z.string().uuid().optional(),
  // Optional client-supplied idempotency hint echoed back in the realtime event.
  clientNonce: z.string().max(64).optional(),
});
export type SendMessageInput = z.infer<typeof SendMessageDTO>;

export const ListMessagesDTO = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
export type ListMessagesInput = z.infer<typeof ListMessagesDTO>;

export const MarkReadDTO = z.object({
  upToMessageId: z.string().uuid(),
});
export type MarkReadInput = z.infer<typeof MarkReadDTO>;

// ─── Participants ────────────────────────────────────────────────────────────

export const AddParticipantDTO = z.object({
  userId: z.string().uuid(),
  role: ParticipantRoleEnum.default('member'),
});
export type AddParticipantInput = z.infer<typeof AddParticipantDTO>;

// ─── Moderation ──────────────────────────────────────────────────────────────

export const ReportMessageDTO = z.object({
  reason: ReportReasonEnum,
  note: z.string().max(500).optional(),
});
export type ReportMessageInput = z.infer<typeof ReportMessageDTO>;

export const ModerateMessageDTO = z.object({
  action: ModerationActionEnum,
  note: z.string().max(500).optional(),
});
export type ModerateMessageInput = z.infer<typeof ModerateMessageDTO>;

export const ModerationQueueDTO = z.object({
  status: ReportStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ModerationQueueInput = z.infer<typeof ModerationQueueDTO>;

// Settings update — only known keys, all values as strings.
export const UpdateModerationSettingsDTO = z
  .record(z.enum(MESSAGING_MODERATION_KEYS), z.string())
  .refine((o) => Object.keys(o).length > 0, { message: 'No settings provided.' });
export type UpdateModerationSettingsInput = z.infer<typeof UpdateModerationSettingsDTO>;
