export const BACK_OFFICE_MESSAGES = {
  // Approval queue
  APPROVAL_NOT_FOUND: 'Approval item not found',
  INVALID_TRANSITION: 'Invalid approval status transition',
  ALREADY_DECIDED: 'Approval item has already reached a terminal decision',
  CLAIM_FAILED: 'Approval item can only be claimed while pending',

  // Support tickets
  TICKET_NOT_FOUND: 'Support ticket not found',
  TICKET_CLOSED: 'Support ticket is closed and cannot accept replies',
  TICKET_NUMBER_FAILED: 'Failed to allocate a ticket number',

  // Generic
  SUBMIT_FAILED: 'Failed to submit approval item',
  DECIDE_FAILED: 'Failed to record approval decision',
  TICKET_CREATE_FAILED: 'Failed to create support ticket',
  REPLY_FAILED: 'Failed to post ticket reply',
} as const;
