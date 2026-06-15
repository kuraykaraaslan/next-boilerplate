import { SamlConfig } from './entities/saml_config.entity';
import type { SamlProfile, SamlMetadata } from './auth_saml.types';
import type { TenantMemberRole } from '../tenant_member/tenant_member.enums';
import type { SafeUser } from '../user/user.types';
import {
  generateAuthUrl, isTenantEnabled, validateCallback, assertNotReplayed,
} from './auth_saml.flow.callback.service';
import {
  generateMetadata, generateLogoutUrl, linkToUser,
} from './auth_saml.flow.metadata.service';
import { mapSamlRoleToMemberRole } from './auth_saml.flow.roles';
import { resolveOrProvisionUser } from './auth_saml.flow.provision.service';

/**
 * SAML auth-flow service facade. The implementation is split across focused
 * modules (`auth_saml.flow.callback.service`, `.metadata.service`, `.roles`,
 * `.provision.service`); this class preserves the single `AuthSamlFlowService.*`
 * entry point its callers depend on.
 */
export default class AuthSamlFlowService {
  static generateAuthUrl(tenantId: string, relayState = ''): Promise<string> {
    return generateAuthUrl(tenantId, relayState);
  }

  static isTenantEnabled(tenantId: string): Promise<boolean> {
    return isTenantEnabled(tenantId);
  }

  static validateCallback(tenantId: string, body: Record<string, string>, isIdpInitiated = false): Promise<SamlProfile> {
    return validateCallback(tenantId, body, isIdpInitiated);
  }

  static assertNotReplayed(tenantId: string, profile: SamlProfile): Promise<void> {
    return assertNotReplayed(tenantId, profile);
  }

  static generateMetadata(tenantId: string): Promise<SamlMetadata> {
    return generateMetadata(tenantId);
  }

  static generateLogoutUrl(
    tenantId: string,
    subject: { nameId: string; nameIdFormat?: string | null; sessionIndex?: string | null },
    relayState = '',
  ): Promise<string> {
    return generateLogoutUrl(tenantId, subject, relayState);
  }

  static linkToUser(userId: string, expectedEmail: string, profile: SamlProfile): Promise<void> {
    return linkToUser(userId, expectedEmail, profile);
  }

  static mapSamlRoleToMemberRole(
    profile: SamlProfile,
    config: Pick<SamlConfig, 'roleAttribute' | 'defaultMemberRole' | 'roleMappingRules'>,
  ): TenantMemberRole {
    return mapSamlRoleToMemberRole(profile, config);
  }

  static resolveOrProvisionUser(
    tenantId: string,
    profile: SamlProfile,
  ): Promise<{ user: SafeUser; jitProvisioned: boolean; memberCreated: boolean }> {
    return resolveOrProvisionUser(tenantId, profile);
  }
}
