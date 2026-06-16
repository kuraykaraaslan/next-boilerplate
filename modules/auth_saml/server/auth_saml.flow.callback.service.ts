import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { BaseSamlProvider, assertSamlNotReplayed } from './saml.engine';
import SamlMessages from './auth_saml.messages';
import { type SamlProfile } from './auth_saml.types';
import AuthSamlConfigService from './auth_saml.config.service';
import { AUTH_SAML_SETTING_KEYS, AUTH_SAML_SETTING_DEFAULTS } from './auth_saml.setting.keys';

export async function generateAuthUrl(tenantId: string, relayState = ''): Promise<string> {
  const config = await AuthSamlConfigService.loadConfig(tenantId);
  if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);
  if (!config.isEnabled) throw new AppError(SamlMessages.NOT_ENABLED, 403, ErrorCode.FORBIDDEN);
  const saml = AuthSamlConfigService.buildSaml(config, tenantId);
  return saml.getAuthorizeUrlAsync(relayState, '', {});
}

export async function isTenantEnabled(tenantId: string): Promise<boolean> {
  const config = await AuthSamlConfigService.loadConfig(tenantId);
  return Boolean(config?.isEnabled);
}

export async function validateCallback(
  tenantId: string,
  body: Record<string, string>,
  isIdpInitiated = false,
): Promise<SamlProfile> {
  const config = await AuthSamlConfigService.loadConfig(tenantId);
  if (!config) throw new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND);
  if (!config.isEnabled) throw new AppError(SamlMessages.NOT_ENABLED, 403, ErrorCode.FORBIDDEN);
  if (isIdpInitiated && !config.allowIdpInitiated) throw new AppError(SamlMessages.IDP_INITIATED_DISABLED, 403, ErrorCode.FORBIDDEN);

  const saml = AuthSamlConfigService.buildSaml(config, tenantId);
  const { profile } = await saml.validatePostResponseAsync(body);
  if (!profile) throw new AppError(SamlMessages.INVALID_RESPONSE, 400, ErrorCode.VALIDATION_ERROR);

  const attrs = (profile as Record<string, unknown>);
  const rawEmail =
    (attrs[config.emailAttribute] as string) ??
    (profile as { email?: string }).email ??
    (profile as { nameID?: string }).nameID ??
    null;
  if (!rawEmail) throw new AppError(SamlMessages.EMAIL_MISSING, 400, ErrorCode.VALIDATION_ERROR);

  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
  const rawName = (attrs[config.nameAttribute] as string | string[] | undefined) ?? null;
  const name = rawName ? (Array.isArray(rawName) ? rawName[0] : rawName) : null;
  const attributes: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'string' || Array.isArray(v)) attributes[k] = v;
  }

  const assertionXml = typeof (profile as { getAssertionXml?: () => string }).getAssertionXml === 'function'
    ? (profile as { getAssertionXml: () => string }).getAssertionXml()
    : null;
  const sessionNotOnOrAfter = BaseSamlProvider.extractSessionNotOnOrAfter(assertionXml);
  const assertionId = (profile as { ID?: string }).ID
    ?? BaseSamlProvider.extractAssertionId(assertionXml)
    ?? null;

  const built: SamlProfile = {
    email,
    name,
    nameId: (profile as { nameID?: string }).nameID ?? email,
    attributes,
    assertionId,
    sessionIndex: (profile as { sessionIndex?: string }).sessionIndex ?? null,
    nameIdFormat: (profile as { nameIDFormat?: string }).nameIDFormat ?? config.nameIdFormat ?? null,
    sessionNotOnOrAfter,
  };

  // Replay detection: reject an assertion ID already seen for this tenant.
  await assertNotReplayed(tenantId, built);

  return built;
}

/**
 * Assertion replay detection. Caches the seen assertion ID scoped by tenantId
 * in Redis with a TTL derived from NotOnOrAfter (so the key self-expires once
 * the assertion is no longer temporally valid anyway). Uses SET NX so the
 * first writer wins; a second sighting of the same ID is rejected.
 * No-op (fail-open) when the `samlReplayDetectionEnabled` setting is off or
 * when there is no usable assertion ID.
 */
export async function assertNotReplayed(tenantId: string, profile: SamlProfile): Promise<void> {
  const enabled = await AuthSamlConfigService.settingBool(
    tenantId, AUTH_SAML_SETTING_KEYS.REPLAY_DETECTION_ENABLED, AUTH_SAML_SETTING_DEFAULTS.REPLAY_DETECTION_ENABLED,
  );
  if (!enabled) return;
  // Shared guard — preserves the per-tenant key (`auth_saml:replay:<tenantId>:<hash>`)
  // and the `saml_replay_blocked` metric scope.
  await assertSamlNotReplayed({
    assertionId: profile.assertionId,
    sessionNotOnOrAfter: profile.sessionNotOnOrAfter,
    keyPrefix: `auth_saml:replay:${tenantId}`,
    scope: tenantId,
  });
}
