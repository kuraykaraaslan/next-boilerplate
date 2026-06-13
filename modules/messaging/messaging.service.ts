import MessagingCrudService from './messaging.crud.service';
import MessagingLifecycleService from './messaging.lifecycle.service';
import MessagingPolicyService from './messaging.policy.service';
import MessagingTicketService from './messaging.ticket.service';
import MessagingModerationService from './messaging.moderation.service';

/**
 * Facade over the messaging sub-services (mirrors the WebhookService pattern).
 * Import this for the common operations; reach for the specific service when you
 * need something niche.
 */
export default class MessagingService {
  // Conversations + participants + message reads
  static createConversation = MessagingCrudService.createConversation.bind(MessagingCrudService);
  static listConversations = MessagingCrudService.listConversations.bind(MessagingCrudService);
  static getConversation = MessagingCrudService.getConversation.bind(MessagingCrudService);
  static addParticipant = MessagingCrudService.addParticipant.bind(MessagingCrudService);
  static removeParticipant = MessagingCrudService.removeParticipant.bind(MessagingCrudService);
  static listMessages = MessagingCrudService.listMessages.bind(MessagingCrudService);

  // Message writes + receipts
  static sendMessage = MessagingLifecycleService.sendMessage.bind(MessagingLifecycleService);
  static markRead = MessagingLifecycleService.markRead.bind(MessagingLifecycleService);
  static markDelivered = MessagingLifecycleService.markDelivered.bind(MessagingLifecycleService);
  static deleteMessage = MessagingLifecycleService.deleteMessage.bind(MessagingLifecycleService);
  static getReadStatus = MessagingLifecycleService.getReadStatus.bind(MessagingLifecycleService);

  // Authorization helpers
  static assertParticipant = MessagingPolicyService.assertParticipant.bind(MessagingPolicyService);

  // WebSocket tickets
  static mintTicket = MessagingTicketService.mintTicket.bind(MessagingTicketService);

  // Moderation
  static reportMessage = MessagingModerationService.createReport.bind(MessagingModerationService);
  static moderateMessage = MessagingModerationService.moderate.bind(MessagingModerationService);
  static listModerationQueue = MessagingModerationService.listQueue.bind(MessagingModerationService);
}
