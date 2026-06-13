import crypto from 'crypto';
import { SAML } from '@node-saml/node-saml';
import redis from '@/modules/redis';
import ObservabilityService from '@/modules/observability';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import SamlMessages from './auth_saml.messages';

/**
 * Generic, config-driven SAML 2.0 engine — the reusable protocol mechanics with
 * NO coupling to per-tenant config or any particular consumer. Both the
 * per-tenant SAML module and the national-identity module (auth_acs) build on
 * this so the node-saml construction, response validation, replay detection and
 * SP-metadata generation live in exactly one place.
 *
 * Consumers subclass `BaseSamlProvider`, pass a plain `SamlEngineConfig`, then map
 * the neutral `SamlValidatedAssertion` into their own domain profile.
 */
export interface SamlEngineConfig {
  /** SP Assertion Consumer Service URL (where the IdP POSTs the response). */
  callbackUrl: string;
  idpSsoUrl?: string;
  idpEntityId?: string;
  idpCertificate?: string;
  spEntityId?: string;
  spPrivateKey?: string;
  spCertificate?: string;
  /** SP key used to decrypt EncryptedAssertion (eIDAS / SPID / DE eID …). Defaults to spPrivateKey. */
  spDecryptionKey?: string;
  signatureAlgorithm?: string;
  nameIdFormat?: string;
  wantAssertionsSigned?: boolean;
  acceptedClockSkewMs?: number;
  /** RequestedAuthnContext class refs (e.g. eIDAS LoA, SPID SpidL2/L3). Enforces assurance. */
  authnContextClassRefs?: string[];
  /** AuthnContext comparison (default 'exact'). */
  racComparison?: 'exact' | 'minimum' | 'maximum' | 'better';
  /** Force re-authentication at the IdP (ignore existing IdP session). */
  forceAuthn?: boolean;
  /** Redis key prefix for replay detection, e.g. `auth_acs:replay:tr_edevlet`. Replay is skipped when unset. */
  replayKeyPrefix?: string;
  /** Tag used on the replay-blocked metric. */
  replayScope?: string;
}

/** Neutral, consumer-agnostic result of validating a SAML response. */
export interface SamlValidatedAssertion {
  attributes: Record<string, unknown>;
  nameId: string | null;
  nameIdFormat: string | null;
  assertionId: string | null;
  sessionIndex: string | null;
  sessionNotOnOrAfter: number | null;
}

export abstract class BaseSamlProvider {
  protected constructor(protected samlConfig: SamlEngineConfig) {}

  protected buildSaml(): SAML {
    const c = this.samlConfig;
    const signing = Boolean(c.spPrivateKey);
    return new SAML({
      callbackUrl: c.callbackUrl,
      entryPoint: c.idpSsoUrl,
      issuer: c.spEntityId,
      idpCert: c.idpCertificate ?? '',
      // Sign the AuthnRequest only when an SP private key is configured.
      privateKey: signing ? c.spPrivateKey : undefined,
      // Decrypt EncryptedAssertion with the SP key when present.
      decryptionPvk: c.spDecryptionKey ?? c.spPrivateKey ?? undefined,
      signatureAlgorithm: (c.signatureAlgorithm as 'sha256' | 'sha512' | 'sha1') ?? 'sha256',
      identifierFormat: c.nameIdFormat ?? undefined,
      wantAssertionsSigned: c.wantAssertionsSigned ?? true,
      acceptedClockSkewMs: typeof c.acceptedClockSkewMs === 'number' ? c.acceptedClockSkewMs : 5000,
      // RequestedAuthnContext: enforce an assurance level when configured (eIDAS/SPID),
      // otherwise omit it entirely so IdPs that reject a forced context still work.
      ...(c.authnContextClassRefs?.length
        ? { authnContext: c.authnContextClassRefs, racComparison: c.racComparison ?? 'minimum' }
        : { disableRequestedAuthnContext: true }),
      forceAuthn: c.forceAuthn ?? false,
    } as ConstructorParameters<typeof SAML>[0]);
  }

  /** Build the IdP redirect URL (SP-initiated SSO). */
  async generateAuthUrl(relayState = ''): Promise<string> {
    return this.buildSaml().getAuthorizeUrlAsync(relayState, '', {});
  }

  /** Validate a SAML POST response into the neutral assertion shape (+ replay check). */
  protected async validateAssertion(body: Record<string, string>): Promise<SamlValidatedAssertion> {
    const saml = this.buildSaml();
    let profile: Record<string, unknown> | null;
    try {
      ({ profile } = (await saml.validatePostResponseAsync(body)) as { profile: Record<string, unknown> | null });
    } catch {
      throw new AppError(SamlMessages.INVALID_RESPONSE, 400, ErrorCode.VALIDATION_ERROR);
    }
    if (!profile) throw new AppError(SamlMessages.INVALID_RESPONSE, 400, ErrorCode.VALIDATION_ERROR);

    const assertionXml = typeof (profile as { getAssertionXml?: () => string }).getAssertionXml === 'function'
      ? (profile as { getAssertionXml: () => string }).getAssertionXml()
      : null;

    const attributes: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(profile)) {
      if (typeof v === 'string' || Array.isArray(v) || typeof v === 'number' || typeof v === 'boolean') attributes[k] = v;
    }

    const result: SamlValidatedAssertion = {
      attributes,
      nameId: (profile.nameID as string | undefined) ?? null,
      nameIdFormat: (profile.nameIDFormat as string | undefined) ?? this.samlConfig.nameIdFormat ?? null,
      assertionId: (profile.ID as string | undefined) ?? BaseSamlProvider.extractAssertionId(assertionXml),
      sessionIndex: (profile.sessionIndex as string | undefined) ?? null,
      sessionNotOnOrAfter: BaseSamlProvider.extractSessionNotOnOrAfter(assertionXml),
    };

    await this.assertNotReplayed(result);
    return result;
  }

  generateMetadata(): string {
    const saml = this.buildSaml();
    const cert = this.samlConfig.spCertificate ?? null;
    return saml.generateServiceProviderMetadata(cert, cert);
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  static sha256(value: string): string {
    return crypto.createHash('sha256').update(value.trim()).digest('hex');
  }

  static extractSessionNotOnOrAfter(assertionXml: string | null): number | null {
    if (!assertionXml) return null;
    const m = assertionXml.match(/SessionNotOnOrAfter="([^"]+)"/);
    if (!m) return null;
    const t = Date.parse(m[1]);
    return Number.isNaN(t) ? null : t;
  }

  static extractAssertionId(assertionXml: string | null): string | null {
    if (!assertionXml) return null;
    return assertionXml.match(/<(?:[\w-]+:)?Assertion[^>]*\bID="([^"]+)"/i)?.[1] ?? null;
  }

  /** Reject an assertion ID already seen (Redis SET NX, fail-open on cache outage). */
  protected async assertNotReplayed(assertion: SamlValidatedAssertion): Promise<void> {
    const prefix = this.samlConfig.replayKeyPrefix;
    if (!prefix || !assertion.assertionId) return;
    const idHash = crypto.createHash('sha256').update(assertion.assertionId).digest('hex');
    const key = `${prefix}:${idHash}`;
    const remainingMs = assertion.sessionNotOnOrAfter ? assertion.sessionNotOnOrAfter - Date.now() : 0;
    const ttlSec = Math.min(60 * 60 * 24, Math.max(60, Math.ceil(remainingMs / 1000) + 60));
    let stored: 'OK' | null = null;
    try {
      stored = (await redis.set(key, '1', 'EX', ttlSec, 'NX')) as 'OK' | null;
    } catch {
      return;
    }
    if (stored !== 'OK') {
      ObservabilityService.recordTenantUsage({ tenantId: this.samlConfig.replayScope ?? 'saml', metric: 'saml_replay_blocked', value: 1 });
      throw new AppError(SamlMessages.REPLAY_DETECTED, 400, ErrorCode.VALIDATION_ERROR);
    }
  }
}
