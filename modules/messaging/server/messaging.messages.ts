const MessagingMessages = {
  CONVERSATION_NOT_FOUND: 'Conversation not found.',
  MESSAGE_NOT_FOUND: 'Message not found.',
  NOT_PARTICIPANT: 'You are not a participant of this conversation.',
  FORBIDDEN_MANAGE: 'You do not have permission to manage participants.',
  FORBIDDEN_DELETE: 'You cannot delete this message.',
  DIRECT_NEEDS_ONE_PEER: 'A direct conversation requires exactly one other participant.',
  GROUP_NEEDS_TITLE: 'A group conversation requires a title.',
  CANNOT_ADD_TO_DIRECT: 'Participants cannot be added to a direct conversation.',
  ALREADY_PARTICIPANT: 'User is already a participant of this conversation.',
  CANNOT_REMOVE_LAST_OWNER: 'You cannot remove the last owner of a conversation.',
  TICKET_INVALID: 'WebSocket ticket is invalid or expired.',
  INVALID_CURSOR: 'The provided pagination cursor is invalid.',
  REPORT_FAILED: 'Could not record the report.',
  INVALID_MODERATION_ACTION: 'Unknown moderation action.',
  FORBIDDEN_MODERATE: 'You do not have permission to moderate messages.',
  MODERATION_DISABLED: 'Moderation is not enabled for this tenant.',
} as const;

export default MessagingMessages;
