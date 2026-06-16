import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { BaseSamlProvider, type SamlValidatedAssertion } from '@nb/auth_saml/server/saml.engine';
import type { AcsProvider } from '../auth_acs.enums';
import type { AcsProfile, AcsProviderService, AcsResolvedConfig } from '../auth_acs.types';
import AcsMessages from '../auth_acs.messages';
import AuthAcsConfigService from '../auth_acs.config.service';

/**
 * SAML base for national IdPs (e-Devlet, eIDAS, SPID, Cl@ve, DE eID …). All the
 * SAML protocol mechanics live in the shared `auth_saml` engine; this class only
 * adds the national-identity concern: map the assertion's configured attributes
 * into an `AcsProfile` keyed on a hashed national identifier. Subclasses override
 * `mapAssertion` only for provider-specific attribute quirks.
 */
export abstract class BaseSamlAcsProvider extends BaseSamlProvider implements AcsProviderService {
  readonly protocol = 'saml' as const;
  protected provider: AcsProvider;
  protected config: AcsResolvedConfig;

  constructor(provider: AcsProvider) {
    const c = AuthAcsConfigService.resolveConfig(provider);
    super({
      callbackUrl: AuthAcsConfigService.callbackUrl(provider),
      idpSsoUrl: c.idpSsoUrl,
      idpEntityId: c.idpEntityId,
      idpCertificate: c.idpCertificate,
      spEntityId: c.spEntityId,
      spPrivateKey: c.spPrivateKey,
      spCertificate: c.spCertificate,
      spDecryptionKey: c.spDecryptionKey,
      signatureAlgorithm: c.signatureAlgorithm,
      nameIdFormat: c.nameIdFormat,
      wantAssertionsSigned: c.wantAssertionsSigned,
      // Enforce the configured assurance level (eIDAS LoA / SPID SpidL2-L3) when set;
      // otherwise omit RequestedAuthnContext (no forced context).
      authnContextClassRefs: c.loa ? [c.loa] : undefined,
      disableRequestedAuthnContext: !c.loa,
      replayKeyPrefix: `auth_acs:replay:${provider}`,
      replayScope: provider,
    });
    this.provider = provider;
    this.config = c;
  }

  async validateCallback(body: Record<string, string>): Promise<AcsProfile> {
    const assertion = await this.validateAssertion(body);
    const mapped = this.mapAssertion(assertion);
    if (!mapped.nationalId) throw new AppError(AcsMessages.NATIONAL_ID_MISSING, 400, ErrorCode.VALIDATION_ERROR);
    return {
      ...mapped,
      nationalIdHash: BaseSamlProvider.sha256(mapped.nationalId),
      nameId: assertion.nameId ?? mapped.nationalId,
      assertionId: assertion.assertionId,
      sessionIndex: assertion.sessionIndex,
      sessionNotOnOrAfter: assertion.sessionNotOnOrAfter,
    };
  }

  /**
   * Map the validated assertion to an AcsProfile (without hash/meta, which
   * validateCallback fills in). Default reads the configured attribute names;
   * the national id falls back to the SAML NameID when the attribute is absent.
   */
  protected mapAssertion(assertion: SamlValidatedAssertion): AcsProfile {
    const c = this.config;
    const pick = (k: string): string | null => {
      const v = assertion.attributes[k];
      if (Array.isArray(v)) return v.length ? String(v[0]) : null;
      return v == null ? null : String(v);
    };
    const nationalId = pick(c.attrNationalId) ?? assertion.nameId ?? '';
    return {
      provider: this.provider,
      country: c.country,
      nationalId,
      nationalIdHash: '',
      firstName: pick(c.attrFirstName),
      lastName: pick(c.attrLastName),
    };
  }
}
