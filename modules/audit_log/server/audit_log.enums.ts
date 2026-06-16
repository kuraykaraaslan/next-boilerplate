import { z } from 'zod';

// API_KEY: actions performed by a machine credential (programmatic access),
// e.g. failed key verification or usage anomalies.
export const AuditActorTypeEnum = z.enum(['USER', 'SYSTEM', 'API_KEY']);
export type AuditActorType = z.infer<typeof AuditActorTypeEnum>;

// Severity / risk classification for an audit action. Used to rank events for
// triage, drive the high-risk webhook (audit.high_risk), and allow severity
// filtering in getAll. Ordered low → critical.
export const AuditSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type AuditSeverity = z.infer<typeof AuditSeverityEnum>;

// Severities considered "high-risk" — these fire the real-time webhook.
export const HIGH_RISK_SEVERITIES: readonly AuditSeverity[] = ['high', 'critical'] as const;

// Predefined action constants — extend freely per domain
export const AuditActions = {
  // Auth
  AUTH_LOGIN:            'auth.login',
  AUTH_LOGIN_FAILED:     'auth.login_failed',
  AUTH_LOGOUT:           'auth.logout',
  AUTH_REGISTER:         'auth.register',
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  AUTH_PASSWORD_RESET:   'auth.password_reset',
  AUTH_OTP_VERIFIED:     'auth.otp_verified',
  AUTH_TOTP_ENABLED:     'auth.totp_enabled',
  AUTH_TOTP_DISABLED:    'auth.totp_disabled',
  AUTH_ACCOUNT_LOCKED:   'auth.account_locked',
  AUTH_ACCOUNT_DISABLED: 'auth.account_disabled',
  AUTH_FORGOT_PASSWORD:  'auth.forgot_password',
  AUTH_EMAIL_VERIFIED:   'auth.email_verified',
  AUTH_DORMANT_DISABLED: 'auth.dormant_disabled',

  // Tenant
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_DELETED: 'tenant.deleted',

  // Members
  MEMBER_ADDED:   'member.added',
  MEMBER_UPDATED: 'member.updated',
  MEMBER_REMOVED: 'member.removed',

  // Invitations
  INVITATION_SENT:     'invitation.sent',
  INVITATION_ACCEPTED: 'invitation.accepted',
  INVITATION_DECLINED: 'invitation.declined',
  INVITATION_REVOKED:  'invitation.revoked',

  // Domains
  DOMAIN_ADDED:           'domain.added',
  DOMAIN_VERIFIED:        'domain.verified',
  DOMAIN_DELETED:         'domain.deleted',
  DOMAIN_DNS_CHECK_FAILED: 'domain.dns_check_failed',

  // Subscription
  SUBSCRIPTION_ASSIGNED:  'subscription.assigned',
  SUBSCRIPTION_UPDATED:   'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  // Settings
  SETTINGS_UPDATED: 'settings.updated',

  // Users (system admin)
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Storage
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED:  'file.deleted',

  // Impersonation
  IMPERSONATION_STARTED: 'impersonation.started',
  IMPERSONATION_ENDED:   'impersonation.ended',

  // Access control
  PERMISSION_DENIED:   'permission.denied',
  SESSION_INVALIDATED: 'auth.session_invalidated',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

// Per-action severity map. Actions not listed here default to `low` (see
// severityForAction). The map is intentionally explicit for security-relevant
// actions so triage and high-risk alerting stay deterministic.
export const ACTION_SEVERITY: Readonly<Record<string, AuditSeverity>> = {
  [AuditActions.AUTH_LOGIN]:            'low',
  [AuditActions.AUTH_LOGOUT]:           'low',
  [AuditActions.AUTH_REGISTER]:         'low',
  [AuditActions.AUTH_EMAIL_VERIFIED]:   'low',
  [AuditActions.AUTH_OTP_VERIFIED]:     'low',

  [AuditActions.AUTH_LOGIN_FAILED]:     'medium',
  [AuditActions.AUTH_PASSWORD_CHANGED]: 'medium',
  [AuditActions.AUTH_PASSWORD_RESET]:   'medium',
  [AuditActions.AUTH_FORGOT_PASSWORD]:  'medium',
  [AuditActions.AUTH_TOTP_ENABLED]:     'medium',
  [AuditActions.AUTH_TOTP_DISABLED]:    'medium',
  [AuditActions.SETTINGS_UPDATED]:      'medium',
  [AuditActions.MEMBER_ADDED]:          'medium',
  [AuditActions.MEMBER_UPDATED]:        'medium',
  [AuditActions.MEMBER_REMOVED]:        'medium',
  [AuditActions.SUBSCRIPTION_UPDATED]:  'medium',
  [AuditActions.SUBSCRIPTION_CANCELLED]:'medium',

  [AuditActions.AUTH_ACCOUNT_LOCKED]:   'high',
  [AuditActions.AUTH_ACCOUNT_DISABLED]: 'high',
  [AuditActions.AUTH_DORMANT_DISABLED]: 'high',
  [AuditActions.SESSION_INVALIDATED]:   'high',
  [AuditActions.PERMISSION_DENIED]:     'high',
  [AuditActions.TENANT_DELETED]:        'high',
  [AuditActions.USER_DELETED]:          'high',
  [AuditActions.DOMAIN_DNS_CHECK_FAILED]: 'high',

  [AuditActions.IMPERSONATION_STARTED]: 'critical',
  [AuditActions.IMPERSONATION_ENDED]:   'critical',
} as const;

/**
 * Resolve the severity for an action string. Unknown / custom actions default
 * to `low` so an unmapped action never accidentally pages a security team.
 */
export function severityForAction(action: string): AuditSeverity {
  return ACTION_SEVERITY[action] ?? 'low';
}
