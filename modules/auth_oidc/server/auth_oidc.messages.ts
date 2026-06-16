const OidcMessages = {
  TOKEN_EXCHANGE_FAILED: 'Failed to exchange the authorization code for tokens',
  USER_INFO_FAILED: 'Failed to fetch the user profile from the identity provider',
  PROVIDER_NOT_CONFIGURED: 'OIDC provider is not configured',
  INVALID_RESPONSE: 'Invalid OIDC response',
  NATIONAL_ID_MISSING: 'The identity provider did not return the expected identifier',
  ID_TOKEN_INVALID: 'The id_token signature or claims could not be verified',
  ID_TOKEN_UNVERIFIABLE: 'No JWKS endpoint is configured to verify the id_token',
  NONCE_MISMATCH: 'The id_token nonce does not match the login request (possible replay)',
  SUBJECT_MISMATCH: 'The id_token and userinfo subjects do not match',
} as const;

export default OidcMessages;
