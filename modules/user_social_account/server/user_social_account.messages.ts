const UserSocialAccountMessages = {
  ACCOUNT_NOT_FOUND: "Social account not found",
  ACCOUNT_ALREADY_LINKED: "This social account is already linked to another user",
  CANNOT_UNLINK_ONLY_AUTH: "Cannot unlink the only authentication method",
  PROVIDER_NOT_ALLOWED: "This social provider is not enabled for your organization",
  MERGE_SAME_USER: "Cannot merge an account into itself",
  MERGE_USER_NOT_FOUND: "One of the accounts to merge was not found",
  MERGE_SOURCE_NOT_PLACEHOLDER: "Only a provisional (no-email) account can be merged into an existing one"
} as const;

export default UserSocialAccountMessages;
