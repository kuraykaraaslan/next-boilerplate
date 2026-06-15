import { AppError, ErrorCode } from '@/modules/common/app-error';
import SamlMessages from './auth_saml.messages';
import { type SamlMetadata, type SamlProfile } from './auth_saml.types';
import UserSocialAccountService from '../user_social_account/user_social_account.service';
import AuthSamlConfigService from './auth_saml.config.service';
import { AUTH_SAML_SETTING_KEYS, AUTH_SAML_SETTING_DEFAULTS } from './auth_saml.setting.keys';

function buildMinimalMetadata(tenantId: string): string {
  const entityId = AuthSamlConfigService.spEntityId(tenantId);
  const acs = AuthSamlConfigService.acsUrl(tenantId);
  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acs}"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

export async function generateMetadata(tenantId: string): Promise<SamlMetadata> {
  const config = await AuthSamlConfigService.loadConfig(tenantId);
  let xml: string;
  if (config) {
    const saml = AuthSamlConfigService.buildSaml(config, tenantId);
    // Dual-cert rollover: publish both the primary and secondary SP certs in
    // SP metadata so the IdP trusts either during a rotation window.
    const certs = [config.spCertificate, config.spCertificateSecondary].filter(Boolean) as string[];
    const signingCerts = certs.length ? (certs.length === 1 ? certs[0] : certs) : null;
    const decryptionCert = config.spCertificate ?? null;
    xml = saml.generateServiceProviderMetadata(decryptionCert, signingCerts);
  } else {
    xml = buildMinimalMetadata(tenantId);
  }
  return {
    entityId: AuthSamlConfigService.spEntityId(tenantId),
    acsUrl: AuthSamlConfigService.acsUrl(tenantId),
    metadataUrl: AuthSamlConfigService.metadataUrl(tenantId),
    xml,
  };
}

// ── Single Logout (SLO) ─────────────────────────────────────────────────

/**
 * Build the IdP LogoutRequest URL for SP-initiated SLO. Requires an IdP SLO
 * endpoint (`idpSloUrl`) and the subject's NameID + SessionIndex (captured at
 * login time and threaded back in). Gated by the `samlSloEnabled` setting.
 */
export async function generateLogoutUrl(
  tenantId: string,
  subject: { nameId: string; nameIdFormat?: string | null; sessionIndex?: string | null },
  relayState = '',
): Promise<string> {
  const enabled = await AuthSamlConfigService.settingBool(
    tenantId, AUTH_SAML_SETTING_KEYS.SLO_ENABLED, AUTH_SAML_SETTING_DEFAULTS.SLO_ENABLED,
  );
  const config = await AuthSamlConfigService.loadConfig(tenantId);
  if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);
  if (!enabled || !config.idpSloUrl) throw new AppError(SamlMessages.SLO_NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);

  const saml = AuthSamlConfigService.buildSaml(config, tenantId);
  // node-saml expects a Profile-shaped subject to construct the LogoutRequest.
  const profile = {
    issuer: config.idpEntityId,
    nameID: subject.nameId,
    nameIDFormat: subject.nameIdFormat ?? config.nameIdFormat ?? null,
    sessionIndex: subject.sessionIndex ?? undefined,
  };
  return saml.getLogoutUrlAsync(profile as Parameters<typeof saml.getLogoutUrlAsync>[0], relayState, {});
}

export async function linkToUser(userId: string, expectedEmail: string, profile: SamlProfile): Promise<void> {
  if (!profile.email) throw new AppError(SamlMessages.EMAIL_MISSING, 400, ErrorCode.VALIDATION_ERROR);
  if (profile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new AppError(SamlMessages.EMAIL_MISMATCH, 400, ErrorCode.VALIDATION_ERROR);
  }
  await UserSocialAccountService.link(userId, 'saml', profile.nameId);
}
