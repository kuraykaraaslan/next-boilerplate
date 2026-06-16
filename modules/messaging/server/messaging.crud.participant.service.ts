import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { Conversation as ConversationEntity } from './entities/conversation.entity';
import { ConversationParticipant as ParticipantEntity } from './entities/conversation_participant.entity';
import { SafeParticipantSchema, type SafeParticipant } from './messaging.types';
import type { AddParticipantInput } from './messaging.dto';
import MessagingMessages from './messaging.messages';
import MessagingPolicyService from './messaging.policy.service';

export async function addParticipant(
  tenantId: string,
  actorUserId: string,
  conversationId: string,
  input: AddParticipantInput,
): Promise<SafeParticipant> {
  await MessagingPolicyService.assertCanManageParticipants(tenantId, actorUserId, conversationId);
  const ds = await tenantDataSourceFor(tenantId);

  const conv = await ds.getRepository(ConversationEntity).findOne({ where: { tenantId, conversationId } });
  if (!conv) throw new AppError(MessagingMessages.CONVERSATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (conv.type === 'direct') {
    throw new AppError(MessagingMessages.CANNOT_ADD_TO_DIRECT, 400, ErrorCode.VALIDATION_ERROR);
  }

  const repo = ds.getRepository(ParticipantEntity);
  const existing = await repo.findOne({ where: { tenantId, conversationId, userId: input.userId } });
  if (existing && !existing.deletedAt) {
    throw new AppError(MessagingMessages.ALREADY_PARTICIPANT, 409, ErrorCode.CONFLICT);
  }
  if (existing && existing.deletedAt) {
    // Re-join: revive the soft-left row.
    existing.deletedAt = null;
    existing.role = input.role;
    const revived = await repo.save(existing);
    return SafeParticipantSchema.parse(revived);
  }

  const saved = await repo.save(
    repo.create({ tenantId, conversationId, userId: input.userId, role: input.role }),
  );
  return SafeParticipantSchema.parse(saved);
}

export async function removeParticipant(
  tenantId: string,
  actorUserId: string,
  conversationId: string,
  targetUserId: string,
): Promise<void> {
  // A user may always remove themselves (leave); otherwise admin/owner required.
  if (targetUserId !== actorUserId) {
    await MessagingPolicyService.assertCanManageParticipants(tenantId, actorUserId, conversationId);
  } else {
    await MessagingPolicyService.assertParticipant(tenantId, actorUserId, conversationId);
  }
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ParticipantEntity);

  const target = await repo.findOne({
    where: { tenantId, conversationId, userId: targetUserId, deletedAt: IsNull() },
  });
  if (!target) throw new AppError(MessagingMessages.NOT_PARTICIPANT, 404, ErrorCode.NOT_FOUND);

  // Never strand a conversation without an owner.
  if (target.role === 'owner') {
    const owners = await repo.count({
      where: { tenantId, conversationId, role: 'owner', deletedAt: IsNull() },
    });
    if (owners <= 1) {
      throw new AppError(MessagingMessages.CANNOT_REMOVE_LAST_OWNER, 400, ErrorCode.VALIDATION_ERROR);
    }
  }
  await repo.softRemove(target);
}
