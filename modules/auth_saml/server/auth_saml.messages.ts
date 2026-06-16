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
  EMAIL_MISMATCH: 'SAML assertion email does not match your account email',
  NOT_MEMBER: 'You are not a member of this tenant and JIT provisioning is disabled',
  JIT_PROVISIONED: 'User provisioned via SAML JIT',
  JIT_ROLE_MAPPED: 'Mapped SAML role to member role',
  REPLAY_DETECTED: 'SAML assertion has already been used (replay detected)',
  METADATA_IMPORT_FAILED: 'Could not import SAML metadata from the provided URL',
  METADATA_URL_REQUIRED: 'A metadata URL is required to import IdP configuration',
  SLO_NOT_CONFIGURED: 'Single Logout is not configured for this tenant',
  INVALID_SIGNATURE_ALGORITHM: 'Unsupported SAML signature algorithm',
  JIT_PROVISION_FAILED: 'JIT provisioning failed and was rolled back',
} as const;

export default SamlMessages;
