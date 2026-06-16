import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import { Message as MessageEntity } from './entities/message.entity';
import { SafeMessageSchema, type SafeMessage } from './messaging.types';
import type { ListMessagesInput } from './messaging.dto';
import MessagingPolicyService from './messaging.policy.service';
import { encodeCursor, decodeCursor } from './messaging.crud.cursor';

export async function listMessages(
  tenantId: string,
  userId: string,
  conversationId: string,
  input: ListMessagesInput,
  isAdmin = false,
): Promise<{ messages: SafeMessage[]; nextCursor: string | null }> {
  await MessagingPolicyService.assertParticipant(tenantId, userId, conversationId);
  const ds = await tenantDataSourceFor(tenantId);

  const qb = ds
    .getRepository(MessageEntity)
    .createQueryBuilder('m')
    .where('m.tenantId = :tenantId', { tenantId })
    .andWhere('m.conversationId = :conversationId', { conversationId })
    .orderBy('m.createdAt', 'DESC')
    .addOrderBy('m.messageId', 'DESC')
    .take(input.limit + 1);

  // Hide non-visible moderation statuses from recipients. The sender always
  // sees their own messages (with the status marker); admins see everything.
  if (!isAdmin) {
    qb.andWhere(
      '(m.moderationStatus IN (:...visible) OR m.senderUserId = :uid)',
      { visible: ['CLEAN', 'FLAGGED', 'APPROVED'], uid: userId },
    );
  }

  if (input.cursor) {
    const cur = decodeCursor(input.cursor);
    qb.andWhere(
      '(m.createdAt < :cAt OR (m.createdAt = :cAt AND m.messageId < :cId))',
      { cAt: cur.createdAt, cId: cur.id },
    );
  }

  const rows = await qb.getMany();
  const hasMore = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.messageId) : null;
  return { messages: page.map((m) => SafeMessageSchema.parse(m)), nextCursor };
}
