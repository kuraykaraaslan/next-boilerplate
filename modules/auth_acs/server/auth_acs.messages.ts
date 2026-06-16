const AcsMessages = {
  UNKNOWN_PROVIDER: 'Unknown national identity provider',
  NOT_ENABLED: 'This national identity provider is not enabled',
  NOT_CONFIGURED: 'This national identity provider is not configured',
  INVALID_RESPONSE: 'Invalid identity provider response',
  NATIONAL_ID_MISSING: 'The identity provider did not return a national identifier',
  REPLAY_DETECTED: 'This assertion has already been used (replay detected)',
  TOKEN_EXCHANGE_FAILED: 'Failed to exchange the authorization code for tokens',
  USER_INFO_FAILED: 'Failed to fetch the user profile from the identity provider',
  JIT_DISABLED: 'Just-in-time provisioning is disabled for this provider',
  JIT_PROVISION_FAILED: 'Just-in-time provisioning failed and was rolled back',
  TENANT_REQUIRED: 'A tenant context is required to complete login',
  STATE_INVALID: 'The login state is missing or invalid',
  METADATA_UNAVAILABLE: 'Metadata is only available for SAML providers',
} as const;

export default AcsMessages;
