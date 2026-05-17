const SSOMessages = {
  INVALID_PROVIDER: 'Invalid SSO provider',
  PROVIDER_NOT_CONFIGURED: 'SSO provider is not configured',
  CODE_NOT_FOUND: 'Authorization code not found',
  STATE_REQUIRED: 'SSO state parameter is required',
  STATE_MISMATCH: 'SSO state mismatch — possible CSRF',
  EMAIL_NOT_FOUND: 'Email not provided by SSO provider',
  EMAIL_NOT_VERIFIED: 'Email returned by SSO provider is not verified',
  EMAIL_MISMATCH: 'SSO provider email does not match your account email',
  OAUTH_ERROR: 'OAuth authentication failed',
  TOKEN_EXCHANGE_FAILED: 'Failed to exchange authorization code for tokens',
  USER_INFO_FAILED: 'Failed to fetch user information',
  ID_TOKEN_MISSING: 'Identity token missing from provider response',
  ID_TOKEN_INVALID: 'Identity token failed signature verification',
} as const;

export default SSOMessages;
