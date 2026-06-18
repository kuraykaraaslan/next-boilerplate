// crypto: HOST-SIDE, vetted JWT/JWKS verification. Trust-critical signature checks
// (e.g. OIDC id_token verification for sandboxed identity providers) must NOT happen
// in the untrusted isolate. The isolate hands the raw token + the JWKS URI here; the
// broker fetches the keys, verifies signature + iss/aud/exp/nonce, returns ONLY the
// verified claims.
import { createPublicKey, createSign, createHmac, type JsonWebKey, type BinaryToTextEncoding } from 'node:crypto';
import jwt from 'jsonwebtoken';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { decryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import { assertSafeWebhookUrl } from '@kuraykaraaslan/webhook/server/webhook.ssrf';
import type { Json } from '../../../sdk/types';
import { SECRET_PREFIX, type BrokerCtx } from '../broker.context';

export const crypto = {
  // Sign a JWT with a private key read HOST-SIDE from the plugin's encrypted secrets
  // (e.g. Apple's `client_secret` client-assertion). The signing key never enters the
  // isolate; the isolate only supplies the claims + signing parameters.
  async signJwt(
    ctx: BrokerCtx,
    claims: Record<string, unknown>,
    opts?: { algorithm?: string; keyid?: string; secretName?: string; expiresInSec?: number },
  ): Promise<Json> {
    const o = opts ?? {};
    const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + (o.secretName ?? 'signingKey'));
    const key = decryptFieldOpt(raw);
    if (typeof key !== 'string' || !key) throw new Error('signJwt: signing key not set');
    const algorithm = (o.algorithm ?? 'ES256') as jwt.Algorithm;
    return jwt.sign(claims as object, key, {
      algorithm,
      keyid: o.keyid,
      ...(o.expiresInSec ? { expiresIn: o.expiresInSec } : {}),
    }) as Json;
  },

  // Sign arbitrary data with a private key from the plugin's encrypted secrets
  // (e.g. Alipay's RSA2 request signature). Key stays host-side; returns base64.
  async signData(ctx: BrokerCtx, data: string, opts?: { algorithm?: string; secretName?: string }): Promise<Json> {
    const o = opts ?? {};
    const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + (o.secretName ?? 'signingKey'));
    const key = decryptFieldOpt(raw);
    if (typeof key !== 'string' || !key) throw new Error('signData: signing key not set');
    const signer = createSign(o.algorithm ?? 'RSA-SHA256');
    signer.update(String(data));
    signer.end();
    return signer.sign(key, 'base64') as Json;
  },

  // Keyed HMAC over arbitrary data using a plugin secret (e.g. iyzico's IYZWSv2
  // request signature). The secret key stays host-side; the isolate passes only the
  // non-secret payload string and gets back the digest.
  async hmac(ctx: BrokerCtx, data: string, opts?: { secretName?: string; algorithm?: string; encoding?: string }): Promise<Json> {
    const o = opts ?? {};
    const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + (o.secretName ?? 'signingKey'));
    const key = decryptFieldOpt(raw);
    if (typeof key !== 'string' || !key) throw new Error('hmac: key not set');
    const h = createHmac(o.algorithm ?? 'sha256', key);
    h.update(String(data));
    return h.digest((o.encoding ?? 'hex') as BinaryToTextEncoding) as Json;
  },

  async verifyJwks(
    ctx: BrokerCtx,
    token: string,
    jwksUri: string,
    expected?: { issuer?: string; audience?: string; nonce?: string },
  ): Promise<Json> {
    const decoded = jwt.decode(String(token), { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) {
      throw new Error('jwt: undecodable or missing kid');
    }
    let parsed: URL;
    try { parsed = new URL(String(jwksUri)); } catch { throw new Error('jwt: invalid jwksUri'); }
    if (parsed.protocol !== 'https:') throw new Error('jwt: jwksUri must be https');
    await assertSafeWebhookUrl(parsed.toString()); // SSRF-guard the JWKS fetch

    const res = await fetch(parsed.toString(), { signal: AbortSignal.timeout(ctx.limits.httpTimeoutMs) });
    if (!res.ok) throw new Error(`jwt: jwks fetch ${res.status}`);
    const body = (await res.json()) as { keys?: Array<Record<string, unknown> & { kid?: string }> };
    const jwk = (body.keys ?? []).find((k) => k.kid === decoded.header.kid);
    if (!jwk) throw new Error('jwt: no matching JWKS key');

    const key = createPublicKey({ key: jwk as unknown as JsonWebKey, format: 'jwk' });
    const e = expected ?? {};
    const claims = jwt.verify(String(token), key, {
      algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384'],
      issuer: e.issuer || undefined,
      audience: e.audience || undefined,
      clockTolerance: 60,
    }) as Record<string, unknown>;
    if (e.nonce && claims.nonce !== e.nonce) throw new Error('jwt: nonce mismatch');
    return claims as Json;
  },
};
