export const TERMS_CONSENT_MESSAGES = {
  SUBJECT_REQUIRED: 'A subject is required: provide a userId or an anonymousId',
  INVALID_PURPOSE: 'Invalid consent purpose',
  NO_DECISIONS: 'At least one consent decision is required',
  RECORD_FAILED: 'Failed to record consent',
  CONFIG_UPDATE_FAILED: 'Failed to update consent banner configuration',

  // Agreements
  AGREEMENT_NOT_FOUND: 'Agreement not found',
  AGREEMENT_KEY_TAKEN: 'An agreement with this key already exists',
  VERSION_NOT_FOUND: 'Agreement version not found',
  NO_PUBLISHED_VERSION: 'Agreement has no published version to accept',
  VERSION_NOT_DRAFT: 'Only draft versions can be published',
  CANNOT_EDIT_PUBLISHED: 'Published versions are immutable; create a new version',
  TEMPLATE_REQUIRED: 'No agreement template is configured for this type',
  CHECKOUT_AGREEMENTS_REQUIRED: 'Required checkout agreements have not been accepted',
} as const;
