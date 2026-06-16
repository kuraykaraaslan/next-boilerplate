import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { signDetachedCms } from '@nb/auth_oidc/server/auth_oidc.cms';
import { BaseOidcAcsProvider } from './base.oidc.provider';
import type { AcsProfile } from '../auth_acs.types';
import AcsMessages from '../auth_acs.messages';

/**
 * Russia — Gosuslugi / ЕСИА (ESIA). OAuth2-based but every authorize/token request
 * must carry a `client_secret` that is a PKCS#7 detached signature over
 * `scope + timestamp + clientId + state` (signed with the integrator cert/key from
 * ACS_PROVIDER_MAP: signingCert/signingKey). The user's oid comes from the
 * access_token JWT claim `urn:esia:sbj_id`; names are fetched from the REST API.
 *
 * VERIFY BEFORE PROD: endpoint version (v1 /aas/oauth2 vs v2), exact param/scope
 * set, and signature encoding must be confirmed against your ESIA test stand.
 * GOST signatures are NOT supported (Node/pkijs do RSA only) — see GOODTOHAVE.
 */
export class EsiaProvider extends BaseOidcAcsProvider {
  constructor() { super('esia_ru'); }

  private esiaTimestamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
  }

  /** PKCS#7 detached signature of scope+timestamp+clientId+state, base64url-encoded. */
  private async clientSecret(scope: string, timestamp: string, state: string): Promise<string> {
    const { signingCert, signingKey, clientId } = this.config;
    if (!signingCert || !signingKey) {
      throw new AppError(`${AcsMessages.NOT_CONFIGURED}: ESIA signingCert/signingKey required`, 400, ErrorCode.VALIDATION_ERROR);
    }
    const data = Buffer.from(`${scope}${timestamp}${clientId ?? ''}${state}`, 'utf8');
    const b64 = await signDetachedCms(data, signingCert, signingKey);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  override async generateAuthUrl(relayState: string): Promise<string> {
    const scope = (this.config.scopes ?? ['openid']).join(' ');
    const timestamp = this.esiaTimestamp();
    const params = new URLSearchParams({
      client_id: this.config.clientId ?? '',
      scope,
      response_type: 'code',
      redirect_uri: this.config.redirectUri ?? '',
      state: relayState,
      timestamp,
      access_type: 'offline',
      client_secret: await this.clientSecret(scope, timestamp, relayState),
    });
    return `${this.config.authUrl}?${params.toString()}`;
  }

  protected override async decorateTokenBody(body: Record<string, string>, state?: string): Promise<void> {
    const scope = (this.config.scopes ?? ['openid']).join(' ');
    const timestamp = this.esiaTimestamp();
    body.scope = scope;
    body.timestamp = timestamp;
    body.token_type = 'Bearer';
    if (state) body.state = state;
    body.client_secret = await this.clientSecret(scope, timestamp, state ?? '');
  }

  override async validateCallback(body: Record<string, string>): Promise<AcsProfile> {
    const code = body.code;
    const state = body.state ?? '';
    if (!code) throw new AppError(AcsMessages.STATE_INVALID, 400, ErrorCode.VALIDATION_ERROR);

    const tokens = await this.requestToken(code, state);
    // ESIA access_token is a JWT carrying the subject oid.
    const claims = jwt.decode(tokens.accessToken) as Record<string, unknown> | null;
    const oid = claims?.['urn:esia:sbj_id'];
    if (!oid) throw new AppError(AcsMessages.NATIONAL_ID_MISSING, 400, ErrorCode.VALIDATION_ERROR);

    let firstName: string | null = null;
    let lastName: string | null = null;
    try {
      const origin = new URL(this.config.authUrl as string).origin;
      const res = await axios.get(`${origin}/rs/prns/${oid}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` }, timeout: 10_000,
      });
      firstName = (res.data?.firstName as string | undefined) ?? null;
      lastName = (res.data?.lastName as string | undefined) ?? null;
    } catch {
      // Person-info fetch is best-effort; the user can complete their profile later.
    }

    const nationalId = String(oid);
    return {
      provider: 'esia_ru',
      country: 'RU',
      nationalId,
      nationalIdHash: crypto.createHash('sha256').update(nationalId).digest('hex'),
      firstName,
      lastName,
      nameId: nationalId,
      assertionId: null,
      sessionIndex: null,
      sessionNotOnOrAfter: null,
    };
  }
}
