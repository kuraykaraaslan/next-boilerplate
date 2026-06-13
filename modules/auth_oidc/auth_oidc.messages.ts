const OidcMessages = {
  TOKEN_EXCHANGE_FAILED: 'Failed to exchange the authorization code for tokens',
  USER_INFO_FAILED: 'Failed to fetch the user profile from the identity provider',
  PROVIDER_NOT_CONFIGURED: 'OIDC provider is not configured',
  INVALID_RESPONSE: 'Invalid OIDC response',
  NATIONAL_ID_MISSING: 'The identity provider did not return the expected identifier',
} as const;

export default OidcMessages;
