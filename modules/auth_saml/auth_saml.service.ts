import { SAML } from '@node-saml/node-saml';
import { tenantDataSourceFor } from '@/libs/typeorm';
import { env } from '@/libs/env';
import { SamlConfig } from './entities/saml_config.entity';
import { SafeSamlConfigSchema, type SafeSamlConfig, type SamlProfile, type SamlMetadata } from './auth_saml.types';
import type { UpsertSamlConfigInput } from './auth_saml.dto';
import SamlMessages from './auth_saml.messages';
import { SAML_NAME_ID_FORMATS } from './auth_saml.enums';

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

export default class SamlService {

  static spEntityId(tenantId: string): string {
    return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/metadata`;
  }

  static acsUrl(tenantId: string): string {
    return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/callback`;
  }

  static metadataUrl(tenantId: string): string {
    return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/metadata`;
  }

  private static buildSaml(config: SamlConfig, tenantId: string): SAML {
    return new SAML({
      callbackUrl: this.acsUrl(tenantId),
      entryPoint: config.idpSsoUrl,
      issuer: this.spEntityId(tenantId),
      idpCert: config.idpCertificate,
      privateKey: config.spPrivateKey ?? undefined,
      signatureAlgorithm: 'sha256',
      identifierFormat: config.nameIdFormat ?? SAML_NAME_ID_FORMATS.EMAIL,
      wantAssertionsSigned: true,
      acceptedClockSkewMs: 5000,
    });
  }

  static async getConfig(tenantId: string): Promise<SafeSamlConfig | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(SamlConfig).findOne({ where: { tenantId } });
    if (!row) return null;
    return SafeSamlConfigSchema.parse(row);
  }

  static async upsertConfig(tenantId: string, input: UpsertSamlConfigInput): Promise<SafeSamlConfig> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SamlConfig);

    let row = await repo.findOne({ where: { tenantId } });

    if (!row) {
      row = repo.create({
        tenantId,
        isEnabled: false,
        idpEntityId: '',
        idpSsoUrl: '',
        idpCertificate: '',
        spPrivateKey: null,
        spCertificate: null,
        emailAttribute: 'email',
        nameAttribute: 'name',
        allowIdpInitiated: false,
        signRequests: false,
        nameIdFormat: SAML_NAME_ID_FORMATS.EMAIL,
      });
    }

    if (input.isEnabled !== undefined) row.isEnabled = input.isEnabled;
    if (input.idpEntityId !== undefined) row.idpEntityId = input.idpEntityId;
    if (input.idpSsoUrl !== undefined) row.idpSsoUrl = input.idpSsoUrl;
    if (input.idpCertificate !== undefined) row.idpCertificate = input.idpCertificate;
    if (input.spPrivateKey !== undefined) row.spPrivateKey = input.spPrivateKey;
    if (input.spCertificate !== undefined) row.spCertificate = input.spCertificate;
    if (input.emailAttribute !== undefined) row.emailAttribute = input.emailAttribute;
    if (input.nameAttribute !== undefined) row.nameAttribute = input.nameAttribute;
    if (input.allowIdpInitiated !== undefined) row.allowIdpInitiated = input.allowIdpInitiated;
    if (input.signRequests !== undefined) row.signRequests = input.signRequests;
    if (input.nameIdFormat !== undefined) row.nameIdFormat = input.nameIdFormat;

    const saved = await repo.save(row);
    return SafeSamlConfigSchema.parse(saved);
  }

  static async deleteConfig(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SamlConfig);
    const row = await repo.findOne({ where: { tenantId } });
    if (row) await repo.remove(row);
  }

  static async generateAuthUrl(tenantId: string): Promise<string> {
    const ds = await tenantDataSourceFor(tenantId);
    const config = await ds.getRepository(SamlConfig).findOne({ where: { tenantId } });
    if (!config) throw new Error(SamlMessages.NOT_CONFIGURED);
    if (!config.isEnabled) throw new Error(SamlMessages.NOT_ENABLED);

    const saml = this.buildSaml(config, tenantId);
    return saml.getAuthorizeUrlAsync('', '', {});
  }

  static async validateCallback(
    tenantId: string,
    body: Record<string, string>,
    isIdpInitiated = false,
  ): Promise<SamlProfile> {
    const ds = await tenantDataSourceFor(tenantId);
    const config = await ds.getRepository(SamlConfig).findOne({ where: { tenantId } });
    if (!config) throw new Error(SamlMessages.NOT_CONFIGURED);
    if (!config.isEnabled) throw new Error(SamlMessages.NOT_ENABLED);
    if (isIdpInitiated && !config.allowIdpInitiated) throw new Error(SamlMessages.IDP_INITIATED_DISABLED);

    const saml = this.buildSaml(config, tenantId);
    const { profile } = await saml.validatePostResponseAsync(body);

    if (!profile) throw new Error(SamlMessages.INVALID_RESPONSE);

    const attrs = (profile as Record<string, unknown>);
    const emailAttr = config.emailAttribute;
    const nameAttr = config.nameAttribute;

    const rawEmail =
      (attrs[emailAttr] as string) ??
      (profile as any).email ??
      (profile as any).nameID ??
      null;

    if (!rawEmail) throw new Error(SamlMessages.EMAIL_MISSING);

    const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    const rawName = (attrs[nameAttr] as string | string[] | undefined) ?? null;
    const name = rawName ? (Array.isArray(rawName) ? rawName[0] : rawName) : null;

    const attributes: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'string' || Array.isArray(v)) attributes[k] = v;
    }

    return { email, name, nameId: (profile as any).nameID ?? email, attributes };
  }

  static async generateMetadata(tenantId: string): Promise<SamlMetadata> {
    const ds = await tenantDataSourceFor(tenantId);
    const config = await ds.getRepository(SamlConfig).findOne({ where: { tenantId } });

    const decryptionCert = config?.spCertificate ?? null;
    const signingCert = config?.spCertificate ?? null;

    let xml: string;
    if (config) {
      const saml = this.buildSaml(config, tenantId);
      xml = saml.generateServiceProviderMetadata(decryptionCert, signingCert);
    } else {
      xml = this.buildMinimalMetadata(tenantId);
    }

    return {
      entityId: this.spEntityId(tenantId),
      acsUrl: this.acsUrl(tenantId),
      metadataUrl: this.metadataUrl(tenantId),
      xml,
    };
  }

  private static buildMinimalMetadata(tenantId: string): string {
    const entityId = this.spEntityId(tenantId);
    const acs = this.acsUrl(tenantId);
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
}
