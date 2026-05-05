const SamlMessages = {
  NOT_CONFIGURED: 'SAML is not configured for this tenant',
  NOT_ENABLED: 'SAML is not enabled for this tenant',
  INVALID_RESPONSE: 'Invalid SAML response',
  EMAIL_MISSING: 'SAML assertion did not include an email address',
  CERT_REQUIRED: 'IdP certificate is required',
  IDP_URL_REQUIRED: 'IdP SSO URL is required',
  IDP_ENTITY_REQUIRED: 'IdP entity ID is required',
  CONFIG_SAVED: 'SAML configuration saved',
  CONFIG_DELETED: 'SAML configuration deleted',
  IDP_INITIATED_DISABLED: 'IdP-initiated SSO is not allowed for this tenant',
} as const;

export default SamlMessages;
