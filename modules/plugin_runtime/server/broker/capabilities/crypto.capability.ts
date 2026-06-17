// crypto: HOST-SIDE, vetted JWT/JWKS verification. Trust-critical signature checks
// (e.g. OIDC id_token verification for sandboxed identity providers) must NOT happen
// in the untrusted isolate. The isolate hands the raw token + the JWKS URI here; the
// broker fetches the keys, verifies signature + iss/aud/exp/nonce, returns ONLY the
// verified claims.
import { createPublicKey, type JsonWebKey } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { assertSafeWebhookUrl } from '@kuraykaraaslan/webhook/server/webhook.ssrf';
import type { Json } from '../../../sdk/types';
import type { BrokerCtx } from '../broker.context';

export const crypto = {
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
