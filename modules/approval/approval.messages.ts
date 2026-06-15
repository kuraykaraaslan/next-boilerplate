export const APPROVAL_MESSAGES = {
  APPROVAL_NOT_FOUND: 'Approval item not found',
  INVALID_TRANSITION: 'Invalid approval status transition',
  ALREADY_DECIDED: 'Approval item has already reached a terminal decision',
  CLAIM_FAILED: 'Approval item can only be claimed while pending',

  SUBMIT_FAILED: 'Failed to submit approval item',
  DECIDE_FAILED: 'Failed to record approval decision',
} as const;
