import ApprovalQueueService from './back_office.approval.service';
import SupportTicketService from './back_office.support.service';

/**
 * Facade over the back-office sub-services. Import this for the common
 * operations — moderation queue submit/claim/decide and support-ticket
 * create/reply/lifecycle. Reach for a specific sub-service only when you need
 * something niche (e.g. registering a decision handler, chain verification).
 */
export default class BackOfficeService {
  // ── Approval queue ──
  static submit = ApprovalQueueService.submit.bind(ApprovalQueueService);
  static listApprovals = ApprovalQueueService.list.bind(ApprovalQueueService);
  static getApproval = ApprovalQueueService.get.bind(ApprovalQueueService);
  static claim = ApprovalQueueService.claim.bind(ApprovalQueueService);
  static decide = ApprovalQueueService.decide.bind(ApprovalQueueService);
  static registerApprovalHandler = ApprovalQueueService.registerHandler.bind(ApprovalQueueService);
  static verifyApprovalChain = ApprovalQueueService.verifyChain.bind(ApprovalQueueService);

  // ── Support tickets ──
  static getNextTicketNumber = SupportTicketService.getNextTicketNumber.bind(SupportTicketService);
  static createTicket = SupportTicketService.createTicket.bind(SupportTicketService);
  static replyTicket = SupportTicketService.reply.bind(SupportTicketService);
  static assignTicket = SupportTicketService.assign.bind(SupportTicketService);
  static setTicketStatus = SupportTicketService.setStatus.bind(SupportTicketService);
  static resolveTicket = SupportTicketService.resolve.bind(SupportTicketService);
  static closeTicket = SupportTicketService.close.bind(SupportTicketService);
  static listTickets = SupportTicketService.list.bind(SupportTicketService);
  static getTicket = SupportTicketService.get.bind(SupportTicketService);
}
