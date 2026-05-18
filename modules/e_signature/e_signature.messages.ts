export const E_SIGNATURE_MESSAGES = {
  PROVIDER_NOT_FOUND: 'E-signature provider not found',
  PROVIDER_NOT_CONFIGURED: 'E-signature provider not configured',
  PROVIDER_FOR_COUNTRY_NOT_FOUND: 'No e-signature provider registered for this country',
  PROVIDER_CAPABILITY_MISSING: 'Provider does not support this capability',

  IDENTIFIER_INVALID: 'The identifier (e.g. phone number, personal code) is invalid for the selected country',
  COUNTRY_INVALID: 'Country code must be ISO 3166-1 alpha-2',

  TRANSACTION_NOT_FOUND: 'Signature transaction not found or expired',
  TRANSACTION_EXPIRED: 'Signature transaction expired',
  TRANSACTION_ALREADY_USED: 'Signature transaction has already been used',
  TRANSACTION_SCOPE_MISMATCH: 'Transaction scope (IP/UA) does not match the initiating client',
  TRANSACTION_NOT_SIGNED: 'Transaction is not yet signed',

  CHALLENGE_GENERATION_FAILED: 'Failed to generate signing challenge',

  CERTIFICATE_PARSE_FAILED: 'Failed to parse certificate',
  CERTIFICATE_INVALID: 'Certificate is invalid',
  CERTIFICATE_NOT_YET_VALID: 'Certificate is not yet valid',
  CERTIFICATE_EXPIRED: 'Certificate has expired',
  CERTIFICATE_REVOKED: 'Certificate has been revoked',
  CERTIFICATE_CHAIN_INVALID: 'Certificate chain validation failed',
  CERTIFICATE_KEY_USAGE_INVALID: 'Certificate key usage does not permit non-repudiation signatures',
  CERTIFICATE_TRUST_ROOT_MISSING: 'No trust roots available for the certificate issuer country',

  SIGNATURE_VERIFY_FAILED: 'Signature verification failed',
  SIGNATURE_FORMAT_UNSUPPORTED: 'Signature format is not supported by this provider',

  OCSP_UNREACHABLE: 'OCSP responder unreachable',
  OCSP_INVALID_RESPONSE: 'OCSP responder returned an invalid response',
  CRL_FETCH_FAILED: 'CRL fetch failed',

  LOA_INSUFFICIENT: 'Authentication level of assurance is insufficient for this operation',

  USER_NOT_FOUND_FOR_CERT: 'No matching user found for the presented certificate',
  USER_PHONE_NOT_VERIFIED: 'The phone number tied to this certificate is not verified on any account',
  USER_NATIONAL_ID_MISMATCH: 'The national identifier on the certificate does not match the user record',
  NEEDS_BINDING: 'This certificate is not bound to any account. Sign in with email/password and bind it first.',

  BIND_2FA_REQUIRED: 'Two-factor authentication is required before binding a new signing certificate',
  BIND_CERT_ALREADY_BOUND: 'This certificate is already bound to another account',

  RATE_LIMIT_EXCEEDED: 'Too many e-signature attempts. Please wait before trying again.',

  AGGREGATOR_REQUEST_FAILED: 'Aggregator request failed',
  AGGREGATOR_TIMEOUT: 'Aggregator request timed out',

  TRUST_LIST_FETCH_FAILED: 'Failed to fetch ETSI trust list',
  TRUST_LIST_SIGNATURE_INVALID: 'ETSI trust list signature is invalid',

  NOT_IMPLEMENTED: 'This capability is not implemented for the selected provider',

  ENCRYPTION_KEY_MISSING: 'SETTINGS_ENCRYPTION_KEY is required for encrypted tenant settings',
} as const;

export type ESignatureMessageKey = keyof typeof E_SIGNATURE_MESSAGES;
