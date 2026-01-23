const TenantDomainMessages = {
  DOMAIN_NOT_FOUND: "Domain not found",
  DOMAIN_ALREADY_EXISTS: "Domain already exists",
  DOMAIN_ALREADY_VERIFIED: "Domain is already verified",
  INVALID_DOMAIN_DATA: "Invalid domain data",
  CANNOT_DELETE_PRIMARY: "Cannot delete primary domain",
  DOMAIN_LIMIT_EXCEEDED: "Domain limit exceeded for this tenant",
  DNS_VERIFICATION_FAILED: "DNS verification failed. Please ensure the TXT record is properly configured."
} as const;

export default TenantDomainMessages;
