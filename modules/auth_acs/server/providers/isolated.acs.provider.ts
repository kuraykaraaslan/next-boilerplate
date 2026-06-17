import crypto from 'crypto';
import { env } from '@kuraykaraaslan/env';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { discover } from '@kuraykaraaslan/auth_oidc/server/auth_oidc.discovery';
import type { AcsProvider } from '../auth_acs.enums';
import type { AcsProfile, AcsProviderService, AcsResolvedConfig } from '../auth_acs.types';
import AuthAcsConfigService from '../auth_acs.config.service';
import AcsMessages from '../auth_acs.messages';

type Invoke = (op: string, input: unknown) => Promise<unknown>;
type AcsProtocol = 'oidc' | 'saml';

/**
 * Host-facing facade that runs a national-identity provider as a SANDBOXED community
 * plugin (OIDC or SAML). The untrusted isolate only does egress / op-forwarding; the
 * trust-critical verification is host-side broker capabilities (crypto.verifyJwks for
 * OIDC id_tokens, saml.validateResponse for XML-DSig). NON-SECRET config is resolved
 * here and passed in; secrets (client secret / SP keys) never enter the isolate —
 * the broker injects them host-side. The AcsProfile (hash, nameId) is assembled here.
 */
export class IsolatedAcsProvider implements AcsProviderService {
  readonly protocol: AcsProtocol;

  constructor(private readonly provider: AcsProvider, private readonly invoke: Invoke, protocol: AcsProtocol) {
    this.protocol = protocol;
  }

  private deriveNonce(state: string): string {
    return crypto.createHmac('sha256', env.CSRF_SECRET).update(`acs-nonce:${this.provider}:${state}`).digest('base64url');
  }

  /** Non-secret config for the isolate. OIDC endpoints are resolved (discovery) here. */
  private async publicConfig(): Promise<Record<string, unknown>> {
    const c: AcsResolvedConfig = AuthAcsConfigService.resolveConfig(this.provider);
    const base = {
      provider: this.provider,
      country: c.country,
      attrNationalId: c.attrNationalId,
      attrFirstName: c.attrFirstName,
      attrLastName: c.attrLastName,
      callbackUrl: c.redirectUri ?? AuthAcsConfigService.callbackUrl(this.provider),
    };
    if (this.protocol === 'saml') {
      // Secrets (spPrivateKey/spDecryptionKey) are read broker-side, not here.
      return {
        ...base,
        idpSsoUrl: c.idpSsoUrl,
        idpCertificate: c.idpCertificate, // public cert
        spEntityId: c.spEntityId,
        nameIdFormat: c.nameIdFormat,
        wantAssertionsSigned: c.wantAssertionsSigned,
        signatureAlgorithm: c.signatureAlgorithm,
        // (authnContextClassRefs/racComparison flow through when configured)
      };
    }
    let { authUrl, tokenUrl, jwksUri } = c;
    if ((!authUrl || !tokenUrl || !jwksUri) && c.issuer) {
      const d = await discover(c.issuer);
      authUrl = authUrl ?? d.authorization_endpoint;
      tokenUrl = tokenUrl ?? d.token_endpoint;
      jwksUri = jwksUri ?? d.jwks_uri;
    }
    if (!authUrl || !tokenUrl || !jwksUri) throw new AppError(AcsMessages.NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);
    return { ...base, issuer: c.issuer, authUrl, tokenUrl, jwksUri, clientId: c.clientId, scopes: c.scopes ?? ['openid'], usesPkce: c.usesPkce };
  }

  async generateAuthUrl(relayState: string): Promise<string> {
    const config = await this.publicConfig();
    const input = this.protocol === 'oidc'
      ? { config, relayState, nonce: this.deriveNonce(relayState) }
      : { config, relayState };
    const url = await this.invoke('generateAuthUrl', input);
    if (typeof url !== 'string') throw new AppError('sandboxed provider returned no auth URL', 500, ErrorCode.INTERNAL_ERROR);
    return url;
  }

  async validateCallback(body: Record<string, string>): Promise<AcsProfile> {
    const state = body.state ?? body.RelayState ?? '';
    const config = await this.publicConfig();
    const mapped = (await this.invoke('validateCallback', {
      config,
      body,
      nonce: this.protocol === 'oidc' ? this.deriveNonce(state) : undefined,
    })) as {
      nationalId?: string; firstName?: string | null; lastName?: string | null; country?: string;
      nameId?: string | null; assertionId?: string | null; sessionIndex?: string | null; sessionNotOnOrAfter?: number | null;
    };

    const nationalId = (mapped?.nationalId ?? '').trim();
    if (!nationalId) throw new AppError(AcsMessages.NATIONAL_ID_MISSING, 400, ErrorCode.VALIDATION_ERROR);

    return {
      provider: this.provider,
      country: mapped.country ?? AuthAcsConfigService.resolveConfig(this.provider).country,
      nationalId,
      nationalIdHash: crypto.createHash('sha256').update(nationalId).digest('hex'),
      firstName: mapped.firstName ?? null,
      lastName: mapped.lastName ?? null,
      nameId: mapped.nameId ?? nationalId,
      assertionId: mapped.assertionId ?? null,
      sessionIndex: mapped.sessionIndex ?? null,
      sessionNotOnOrAfter: mapped.sessionNotOnOrAfter ?? null,
    };
  }
}
