const SSOMessages = {
  INVALID_PROVIDER: "Invalid SSO provider",
  PROVIDER_NOT_CONFIGURED: "SSO provider is not configured",
  CODE_NOT_FOUND: "Authorization code not found",
  EMAIL_NOT_FOUND: "Email not provided by SSO provider",
  OAUTH_ERROR: "OAuth authentication failed",
  TOKEN_EXCHANGE_FAILED: "Failed to exchange authorization code for tokens",
  USER_INFO_FAILED: "Failed to fetch user information"
} as const;

export default SSOMessages;
