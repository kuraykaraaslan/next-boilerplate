const ApiKeyMessages = {
  NOT_FOUND: 'API key not found.',
  INVALID_KEY: 'Invalid or expired API key.',
  KEY_INACTIVE: 'API key is inactive.',
  KEY_EXPIRED: 'API key has expired.',
  INSUFFICIENT_SCOPE: 'API key does not have the required scope.',
  NAME_REQUIRED: 'API key name is required.',
  SCOPE_REQUIRED: 'At least one scope must be selected.',
  CREATE_SUCCESS: 'API key created successfully.',
  DELETE_SUCCESS: 'API key revoked successfully.',
  UPDATE_SUCCESS: 'API key updated successfully.',
  FORBIDDEN: 'You do not have permission to manage API keys.',
} as const;

export default ApiKeyMessages;
