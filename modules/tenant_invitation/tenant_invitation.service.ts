import 'reflect-metadata';
import { SafeTenantInvitation } from './tenant_invitation.types';
import { SendInvitationInput, GetInvitationsInput } from './tenant_invitation.dto';
import { hashToken, generateRawToken } from './tenant_invitation.helpers';
import { getByTenantId, getById, getByToken, preview } from './tenant_invitation.read.service';
import {
  send, accept, decline, revoke, resend, sweepExpired, autoAcceptForEmail,
} from './tenant_invitation.lifecycle.service';

/**
 * Tenant-invitation service facade. The implementation is split across focused
 * modules (`tenant_invitation.helpers` token/TTL/role/usable helpers,
 * `tenant_invitation.read.service` reads + caching, `tenant_invitation.lifecycle.service`
 * send/accept/decline/revoke/resend/sweep flows); this class preserves the single
 * `TenantInvitationService.*` entry point its callers depend on.
 */
export default class TenantInvitationService {
  static hashToken(rawToken: string): string {
    return hashToken(rawToken);
  }

  static generateRawToken(): string {
    return generateRawToken();
  }

  static getByTenantId(input: GetInvitationsInput): Promise<{ invitations: SafeTenantInvitation[]; total: number }> {
    return getByTenantId(input);
  }

  static getById(invitationId: string, tenantId: string): Promise<SafeTenantInvitation> {
    return getById(invitationId, tenantId);
  }

  static getByToken(rawToken: string): Promise<SafeTenantInvitation> {
    return getByToken(rawToken);
  }

  static preview(tenantId: string, rawToken: string): Promise<{ invitation: SafeTenantInvitation; tenant: { tenantId: string; name: string } }> {
    return preview(tenantId, rawToken);
  }

  static send(tenantId: string, invitedByUserId: string, input: SendInvitationInput): Promise<{ invitation: SafeTenantInvitation; rawToken: string }> {
    return send(tenantId, invitedByUserId, input);
  }

  static accept(tenantId: string, userId: string, userEmail: string, rawToken: string): Promise<void> {
    return accept(tenantId, userId, userEmail, rawToken);
  }

  static decline(tenantId: string, userEmail: string, rawToken: string): Promise<void> {
    return decline(tenantId, userEmail, rawToken);
  }

  static revoke(invitationId: string, tenantId: string): Promise<void> {
    return revoke(invitationId, tenantId);
  }

  static resend(invitationId: string, tenantId: string): Promise<{ invitation: SafeTenantInvitation; rawToken: string }> {
    return resend(invitationId, tenantId);
  }

  static sweepExpired(tenantId: string): Promise<number> {
    return sweepExpired(tenantId);
  }

  static autoAcceptForEmail(userId: string, email: string): Promise<void> {
    return autoAcceptForEmail(userId, email);
  }
}
