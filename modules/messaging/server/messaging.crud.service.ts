import 'reflect-metadata';
import type {
  SafeConversation, SafeConversationDetail, SafeConversationSummary,
  SafeParticipant, SafeMessage,
} from './messaging.types';
import type {
  CreateConversationInput, ListConversationsInput, ListMessagesInput, AddParticipantInput,
} from './messaging.dto';
import { createConversation, listConversations, getConversation } from './messaging.crud.conversation.service';
import { addParticipant, removeParticipant } from './messaging.crud.participant.service';
import { listMessages } from './messaging.crud.message.service';

/**
 * Persistence for conversations, participants and messages. Tenant-isolated:
 * every query filters by `tenantId` via the per-tenant DataSource. Authorization
 * is delegated to {@link MessagingPolicyService}.
 *
 * The implementation is split across focused modules
 * (`messaging.crud.conversation.service`, `.participant.service`,
 * `.message.service`, plus the `.cursor` helper); this class preserves the
 * single `MessagingCrudService.*` entry point.
 */
export default class MessagingCrudService {
  static createConversation(tenantId: string, actorUserId: string, input: CreateConversationInput): Promise<SafeConversation> {
    return createConversation(tenantId, actorUserId, input);
  }

  static listConversations(
    tenantId: string,
    userId: string,
    input: ListConversationsInput,
  ): Promise<{ conversations: SafeConversationSummary[]; nextCursor: string | null }> {
    return listConversations(tenantId, userId, input);
  }

  static getConversation(tenantId: string, userId: string, conversationId: string): Promise<SafeConversationDetail> {
    return getConversation(tenantId, userId, conversationId);
  }

  static addParticipant(
    tenantId: string,
    actorUserId: string,
    conversationId: string,
    input: AddParticipantInput,
  ): Promise<SafeParticipant> {
    return addParticipant(tenantId, actorUserId, conversationId, input);
  }

  static removeParticipant(
    tenantId: string,
    actorUserId: string,
    conversationId: string,
    targetUserId: string,
  ): Promise<void> {
    return removeParticipant(tenantId, actorUserId, conversationId, targetUserId);
  }

  static listMessages(
    tenantId: string,
    userId: string,
    conversationId: string,
    input: ListMessagesInput,
    isAdmin = false,
  ): Promise<{ messages: SafeMessage[]; nextCursor: string | null }> {
    return listMessages(tenantId, userId, conversationId, input, isAdmin);
  }
}
