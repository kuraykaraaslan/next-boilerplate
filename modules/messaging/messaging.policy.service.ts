import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { ConversationParticipant as ParticipantEntity } from './entities/conversation_participant.entity';
import { Message as MessageEntity } from './entities/message.entity';
import { SafeParticipantSchema, type SafeParticipant } from './messaging.types';
import { PARTICIPANT_ROLE_RANK, type ParticipantRole } from './messaging.enums';
import MessagingMessages from './messaging.messages';

/**
 * Conversation-scoped authorization. All checks are tenant-isolated and operate
 * on the participant's conversation role (`owner` > `admin` > `member`), which
 * is independent of the user's tenant-level role.
 */
export default class MessagingPolicyService {
  static hasParticipantRole(role: ParticipantRole, required: ParticipantRole): boolean {
    return PARTICIPANT_ROLE_RANK[role] >= PARTICIPANT_ROLE_RANK[required];
  }

  /** Resolve the caller's active membership or throw 403/404. */
  static async assertParticipant(
    tenantId: string,
    userId: string,
    conversationId: string,
  ): Promise<SafeParticipant> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(ParticipantEntity).findOne({
      where: { tenantId, conversationId, userId, deletedAt: IsNull() },
    });
    if (!row) throw new AppError(MessagingMessages.NOT_PARTICIPANT, 403, ErrorCode.FORBIDDEN);
    return SafeParticipantSchema.parse(row);
  }

  /** Caller must be owner/admin of the conversation to manage participants. */
  static async assertCanManageParticipants(
    tenantId: string,
    userId: string,
    conversationId: string,
  ): Promise<SafeParticipant> {
    const me = await this.assertParticipant(tenantId, userId, conversationId);
    if (!this.hasParticipantRole(me.role, 'admin')) {
      throw new AppError(MessagingMessages.FORBIDDEN_MANAGE, 403, ErrorCode.FORBIDDEN);
    }
    return me;
  }

  /** A message may be deleted by its sender or by a conversation admin/owner. */
  static async assertCanDeleteMessage(
    tenantId: string,
    userId: string,
    conversationId: string,
    message: Pick<MessageEntity, 'senderUserId'>,
  ): Promise<void> {
    const me = await this.assertParticipant(tenantId, userId, conversationId);
    const isSender = message.senderUserId === userId;
    const isManager = this.hasParticipantRole(me.role, 'admin');
    if (!isSender && !isManager) {
      throw new AppError(MessagingMessages.FORBIDDEN_DELETE, 403, ErrorCode.FORBIDDEN);
    }
  }
}
