const TenantMemberMessages = {
  MEMBER_NOT_FOUND: "Tenant member not found",
  MEMBER_ALREADY_EXISTS: "User is already a member of this tenant",
  INVALID_MEMBER_DATA: "Invalid member data",
  CANNOT_REMOVE_OWNER: "Cannot remove the owner from the tenant",
  CANNOT_DEMOTE_OWNER: "Cannot demote the owner",
  LAST_OWNER: "Cannot remove the last owner of the tenant"
} as const;

export default TenantMemberMessages;
