const ApiKeyMessages = {
  NOT_FOUND: 'API key not found.',
  INVALID_KEY: 'Invalid or expired API key.',
  KEY_INACTIVE: 'API key is inactive.',
  KEY_EXPIRED: 'API key has expired.',
  INSUFFICIENT_SCOPE: 'API key does not have the required scope.',
  SCOPE_NOT_ALLOWED: "One or more requested scopes are not permitted by this tenant's plan.",
  NAME_REQUIRED: 'API key name is required.',
  SCOPE_REQUIRED: 'At least one scope must be selected.',
  CREATE_SUCCESS: 'API key created successfully.',
  DELETE_SUCCESS: 'API key revoked successfully.',
  UPDATE_SUCCESS: 'API key updated successfully.',
  ROTATE_SUCCESS: 'API key rotated successfully.',
  REVOKE_ALL_SUCCESS: 'All API keys for this tenant have been revoked.',
  FORBIDDEN: 'You do not have permission to manage API keys.',
  // Lifecycle / policy enforcement
  MAX_KEYS_REACHED: 'The maximum number of active API keys for this tenant has been reached.',
  TTL_EXCEEDS_MAX: 'The requested expiry exceeds the maximum key lifetime allowed for this tenant.',
  EXPIRY_REQUIRED: 'This tenant requires every API key to have an expiry date.',
  // Network / security
  IP_NOT_ALLOWED: 'This API key may not be used from the current IP address.',
  RATE_LIMITED: 'API key rate limit exceeded. Please slow down.',
} as const;

export default ApiKeyMessages;
