export interface TenantExportData {
  exportedAt: string;
  tenantId: string;
  members: object[];
  domains: object[];
  auditLogs: object[];
  webhooks: object[];
  webhookDeliveries: object[];
  settings: object[] | null;
  payments: object[];
  paymentTransactions: object[];
  subscriptions: object[];
  subscriptionPlans: object[];
  planFeatures: object[];
  coupons: object[];
  couponRedemptions: object[];
  apiKeys: object[];
  samlConfigs: object[];
  uploadedFiles: object[];
  aiUsageLogs: object[];
  notificationLogs: object[];
  tenantUsage: object[];
}

export interface ExportOptions {
  /** GDPR redaction: pseudonymise direct identifiers (email/phone/IP/recipient). */
  redactPii?: boolean;
  /** Restrict the export to a subset of collections (keys of TenantExportData). */
  collections?: string[];
  /** Override the audit-log row cap (default from setting `exportAuditLogCap` or 1000). */
  auditLogCap?: number;
}

export interface ExportManifest {
  exportedAt: string;
  tenantId: string;
  redacted: boolean;
  sha256: string;
  sizeBytes: number;
  counts: Record<string, number>;
}
