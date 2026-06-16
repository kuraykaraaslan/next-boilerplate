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
  IP_NOT_ALLOWED: "Access from this IP address is not permitted for this tenant",
  IP_BLOCKED: "Your IP address is blocked for this tenant",
  TWO_FACTOR_REQUIRED: "This tenant requires two-factor authentication",
  CONCURRENT_SESSION_LIMIT: "Maximum number of concurrent sessions reached for this tenant",
  TOO_MANY_AUTH_FAILURES: "Too many authentication failures for this tenant; please retry shortly",
} as const;

export default TenantAuthMessages;
