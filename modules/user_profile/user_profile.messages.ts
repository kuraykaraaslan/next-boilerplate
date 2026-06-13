const UserProfileMessages = {
  PROFILE_NOT_FOUND: 'Profile not found',
  PROFILE_EXISTS: 'Profile already exists for this user',
  RESERVED_DISPLAY_NAME: 'This display name is reserved and cannot be used',
  INVALID_SOCIAL_LINK_URL: 'One or more social link URLs are invalid',
  CUSTOM_FIELD_NOT_ALLOWED: 'One or more custom fields are not permitted for this tenant',
} as const;

export default UserProfileMessages;
