import { z } from 'zod';

export const AuditActorTypeEnum = z.enum(['USER', 'SYSTEM']);
export type AuditActorType = z.infer<typeof AuditActorTypeEnum>;

// Predefined action constants — extend freely per domain
export const AuditActions = {
  // Auth
  AUTH_LOGIN:            'auth.login',
  AUTH_LOGOUT:           'auth.logout',
  AUTH_REGISTER:         'auth.register',
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  AUTH_PASSWORD_RESET:   'auth.password_reset',
  AUTH_OTP_VERIFIED:     'auth.otp_verified',
  AUTH_TOTP_ENABLED:     'auth.totp_enabled',
  AUTH_TOTP_DISABLED:    'auth.totp_disabled',

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
  DOMAIN_ADDED:    'domain.added',
  DOMAIN_VERIFIED: 'domain.verified',
  DOMAIN_DELETED:  'domain.deleted',

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
