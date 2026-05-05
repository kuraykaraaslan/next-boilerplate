const WebhookMessages = {
  NOT_FOUND: 'Webhook not found.',
  DELIVERY_NOT_FOUND: 'Webhook delivery not found.',
  URL_REQUIRED: 'Webhook URL is required.',
  URL_INVALID: 'Webhook URL must be a valid HTTPS URL.',
  EVENTS_REQUIRED: 'At least one event must be selected.',
  NAME_REQUIRED: 'Webhook name is required.',
  CREATE_SUCCESS: 'Webhook created successfully.',
  UPDATE_SUCCESS: 'Webhook updated successfully.',
  DELETE_SUCCESS: 'Webhook deleted successfully.',
  TEST_SENT: 'Test event dispatched.',
  FORBIDDEN: 'You do not have permission to manage webhooks.',
  REDELIVER_QUEUED: 'Webhook redelivery queued.',
} as const;

export default WebhookMessages;
