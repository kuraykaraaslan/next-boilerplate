import { SAML } from '@node-saml/node-saml';
import { buildSamlClient } from './saml.engine';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis';
import { env } from '@kuraykaraaslan/env';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { SamlConfig } from './entities/saml_config.entity';
import { SAML_NAME_ID_FORMATS, type SamlSignatureAlgorithm } from './auth_saml.enums';

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';
const SAML_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export function configCacheKey(tenantId: string): string {
  return `auth_saml:config:${tenantId}`;
}

export async function clearCache(tenantId: string): Promise<void> {
  await redis.del(configCacheKey(tenantId)).catch(() => {});
}

export async function loadConfig(tenantId: string): Promise<SamlConfig | null> {
  const cacheKey = configCacheKey(tenantId);
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return parsed === null ? null : (parsed as SamlConfig);
    } catch { await redis.del(cacheKey).catch(() => {}); }
  }
  return singleFlight(cacheKey, async () => {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(SamlConfig).findOne({ where: { tenantId } });
    await redis.setex(cacheKey, jitter(SAML_CACHE_TTL), JSON.stringify(row ?? null)).catch(() => {});
    return row;
  });
}

export function spEntityId(tenantId: string): string {
  return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/metadata`;
}

export function acsUrl(tenantId: string): string {
  return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/callback`;
}

export function metadataUrl(tenantId: string): string {
  return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/metadata`;
}

export function sloUrl(tenantId: string): string {
  return `${APP_HOST}/tenant/${tenantId}/api/auth/saml/slo`;
}

/**
 * Construct the @node-saml client from the tenant's row. Wires the
 * previously-hardcoded knobs to per-tenant columns:
 *   - signRequests   → privateKey is only passed when signing is on (node-saml
 *                      signs the AuthnRequest iff a privateKey is present).
 *   - signatureAlgorithm / acceptedClockSkewMs / wantAssertionsSigned → columns.
 *   - decryptionPvk  → SP private key (enables EncryptedAssertion decryption).
 *   - logoutUrl      → IdP SLO endpoint (enables LogoutRequest generation).
 */
export function buildSaml(config: SamlConfig, tenantId: string): SAML {
  // Delegates node-saml construction to the shared engine builder. Behaviour is
  // preserved: signing gated on signRequests, EMAIL nameId default, SP key as the
  // decryption key, SLO via idpSloUrl, and node-saml's default RequestedAuthnContext
  // (we do NOT opt into disableRequestedAuthnContext here).
  return buildSamlClient({
    callbackUrl: acsUrl(tenantId),
    idpSsoUrl: config.idpSsoUrl,
    spEntityId: spEntityId(tenantId),
    idpCertificate: config.idpCertificate,
    spPrivateKey: config.spPrivateKey ?? undefined,
    signRequests: Boolean(config.signRequests),
    signatureAlgorithm: (config.signatureAlgorithm as SamlSignatureAlgorithm) || 'sha256',
    nameIdFormat: config.nameIdFormat ?? SAML_NAME_ID_FORMATS.EMAIL,
    wantAssertionsSigned: config.wantAssertionsSigned ?? true,
    acceptedClockSkewMs: typeof config.clockSkewMs === 'number' ? config.clockSkewMs : 5000,
    logoutUrl: config.idpSloUrl || undefined,
  });
}

export async function settingBool(tenantId: string, key: string, fallback: boolean): Promise<boolean> {
  const raw = await SettingService.getValue(tenantId, key).catch(() => null);
  if (raw === null || raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

export async function settingNumber(tenantId: string, key: string, fallback: number): Promise<number> {
  const raw = await SettingService.getValue(tenantId, key).catch(() => null);
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
