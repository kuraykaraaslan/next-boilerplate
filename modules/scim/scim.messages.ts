/**
 * Human-readable strings returned in SCIM error bodies (RFC 7644 §3.12).
 * Kept short — IdPs only surface the `detail` field in their admin UI.
 */
const ScimMessages = {
  USER_NOT_FOUND: 'User not found.',
  USER_ALREADY_EXISTS: 'A user with that userName already exists.',
  INVALID_BEARER_TOKEN: 'Invalid bearer token.',
  MISSING_BEARER_TOKEN: 'Missing Authorization header.',
  INSUFFICIENT_SCOPE: 'Bearer token does not have the required scope.',
  INVALID_FILTER: 'Unsupported or malformed filter.',
  INVALID_PATCH_PATH: 'Unsupported PATCH path.',
  INVALID_PATCH_OP: 'Unsupported PATCH operation.',
  INVALID_PAYLOAD: 'Malformed SCIM payload.',
  USERNAME_REQUIRED: 'userName is required.',
  GROUPS_NOT_IMPLEMENTED: 'SCIM Groups are not supported by this service provider.',
  TENANT_MISMATCH: 'Resource does not belong to this tenant.',
  TOO_MANY_RESULTS: 'Requested page exceeds configured maximum.',
  INTERNAL_ERROR: 'Internal SCIM provider error.',
} as const;

export default ScimMessages;
