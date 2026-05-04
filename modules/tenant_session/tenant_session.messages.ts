const TenantAuthMessages = {
  TENANT_NOT_FOUND: "Tenant not found",
  TENANT_ID_REQUIRED: "Tenant ID is required",
  USER_NOT_MEMBER_OF_TENANT: "User is not a member of this tenant",
  TENANT_INACTIVE: "Tenant is inactive",
  TENANT_SUSPENDED: "Tenant is suspended",
  MEMBER_INACTIVE: "Tenant membership is inactive",
  MEMBER_SUSPENDED: "Tenant membership is suspended",
  MEMBER_PENDING: "Tenant membership is pending approval",
  INSUFFICIENT_TENANT_PERMISSIONS: "Insufficient permissions for this tenant operation",
  INSUFFICIENT_TENANT_SCOPE: "Insufficient scope for this tenant operation",
  INVALID_TENANT_ID_SOURCE: "Invalid tenant ID source",
} as const;

export default TenantAuthMessages;
