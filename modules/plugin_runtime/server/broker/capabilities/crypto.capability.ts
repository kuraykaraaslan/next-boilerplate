// crypto: HOST-SIDE, vetted JWT/JWKS verification. Trust-critical signature checks
// (e.g. OIDC id_token verification for sandboxed identity providers) must NOT happen
// in the untrusted isolate. The isolate hands the raw token + the JWKS URI here; the
// broker fetches the keys, verifies signature + iss/aud/exp/nonce, returns ONLY the
// verified claims.
import { createPublicKey, createSign, createHmac, createHash, randomBytes, type JsonWebKey, type BinaryToTextEncoding } from 'node:crypto';
import jwt from 'jsonwebtoken';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { decryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import { assertSafeWebhookUrl } from '@kuraykaraaslan/webhook/server/webhook.ssrf';
import { ESignatureDocumentService } from '@kuraykaraaslan/e_signature';
import type { Json } from '../../../sdk/types';
import { SECRET_PREFIX, type BrokerCtx } from '../broker.context';

// Default setting keys for the tenant's invoice seal certificate (mirrors
// invoice.signature.service); a plugin may override via opts.
const INVOICE_KEY_KEY = 'invoiceSigningKeyPem';
const INVOICE_CERT_KEY = 'invoiceSigningCertPem';

const HASH_ALGOS = new Set(['sha256', 'sha384', 'sha512', 'sha1']);
const HASH_ENCODINGS = new Set(['hex', 'base64', 'base64url']);

export const crypto = {

  // Cryptographically-strong random bytes for plugins that have no isolate RNG
  // (e.g. Smart-ID's per-login nonce). Returns the bytes in the requested encoding.
  // No secret involved — pure host primitive the V8 isolate lacks.
  randomBytes(_ctx: BrokerCtx, n: number, encoding?: string): Json {
    const len = Math.max(1, Math.min(Number(n) || 0, 1024));
    const enc = HASH_ENCODINGS.has(String(encoding)) ? (encoding as BufferEncoding) : 'base64';
    return randomBytes(len).toString(enc) as Json;
  },

  // Digest of one or more byte parts, concatenated HOST-SIDE so the isolate never
  // has to do binary concat (it can't, without Buffer). Each part declares its own
  // encoding ('utf8' | 'base64' | 'hex'); the result is returned in `outputEncoding`.
  // Pure (no secret) — gives sandboxed providers SHA-256/384/512 hashing.
  hash(
    _ctx: BrokerCtx,
    parts: Array<{ value: string; encoding?: string }>,
    opts?: { algorithm?: string; outputEncoding?: string },
  ): Json {
    const algorithm = HASH_ALGOS.has(String(opts?.algorithm)) ? opts!.algorithm! : 'sha256';
    const outEnc = HASH_ENCODINGS.has(String(opts?.outputEncoding)) ? (opts!.outputEncoding as BinaryToTextEncoding) : 'base64';
    const h = createHash(algorithm);
    for (const p of parts ?? []) {
      const enc = (['utf8', 'base64', 'hex'].includes(String(p?.encoding)) ? p.encoding : 'utf8') as BufferEncoding;
      h.update(Buffer.from(String(p?.value ?? ''), enc));
    }
    return h.digest(outEnc) as Json;
  },

  // XAdES / XML-DSig signing for sandboxed document plugins (e.g. e-invoicing
  // adapters). The XML-signing engine and the tenant's seal private key stay
  // HOST-SIDE — the isolate only hands over the XML to be enveloped-signed and
  // gets back the signed XML. When no seal is configured the original XML is
  // returned unchanged (signature is optional for most regimes).
  async signXml(
    ctx: BrokerCtx,
    xml: string,
    opts?: { keyKey?: string; certKey?: string; xpath?: string; prefix?: string },
  ): Promise<Json> {
    const o = opts ?? {};
    const { xml: signed } = await ESignatureDocumentService.signXmlIfConfigured(ctx.tenantId, String(xml), {
      keyKey: o.keyKey || INVOICE_KEY_KEY,
      certKey: o.certKey || INVOICE_CERT_KEY,
      xpath: o.xpath,
      prefix: o.prefix,
    });
    return signed as Json;
  },
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

  // Keyed HMAC over arbitrary data (e.g. iyzico's IYZWSv2 signature, or an AWS
  // SigV4 signing-key chain). Two keying modes:
  //   • secretName (+ optional prefix) — key = prefix + the plugin's host-side secret
  //     (e.g. prefix 'AWS4' for SigV4's kDate step). The secret never enters the isolate.
  //   • key { value, encoding } — an explicit binary key passed in, for the SigV4 chain
  //     steps that key off the PREVIOUS hmac's (non-secret) digest.
  async hmac(
    ctx: BrokerCtx,
    data: string,
    opts?: { secretName?: string; prefix?: string; key?: { value: string; encoding?: string }; algorithm?: string; encoding?: string },
  ): Promise<Json> {
    const o = opts ?? {};
    let key: Buffer | string;
    if (o.key && typeof o.key.value === 'string') {
      key = Buffer.from(o.key.value, (o.key.encoding ?? 'hex') as BufferEncoding);
    } else {
      const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + (o.secretName ?? 'signingKey'));
      const secret = decryptFieldOpt(raw);
      if (typeof secret !== 'string' || !secret) throw new Error('hmac: key not set');
      key = (o.prefix ?? '') + secret;
    }
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
