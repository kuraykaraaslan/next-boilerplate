export const FEATURE_FLAGS_MESSAGES = {
  FLAG_NOT_FOUND: 'Feature flag not found',
  FLAG_KEY_TAKEN: 'A feature flag with this key already exists',
  INVALID_KEY: 'Flag key must be 1-64 chars: lowercase letters, digits, "-" or "_"',
  OVERRIDE_NOT_FOUND: 'Feature flag override not found',
  CREATE_FAILED: 'Failed to create feature flag',
  UPDATE_FAILED: 'Failed to update feature flag',
} as const;
