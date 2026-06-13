import { webcrypto } from 'crypto';
import * as asn1js from 'asn1js';
import {
  CryptoEngine, setEngine, ContentInfo, SignedData, SignerInfo,
  Certificate, IssuerAndSerialNumber, EncapsulatedContentInfo,
} from 'pkijs';

/**
 * PKCS#7 / CMS detached SignedData (RSA-SHA256) over arbitrary bytes — the
 * signature format required by Russia's ЕСИА / Gosuslugi (ESIA) for the
 * `client_secret`. Uses pkijs over Node's native WebCrypto (no extra deps).
 *
 * NOTE: ESIA production may mandate GOST R 34.10/34.11 signatures, which Node
 * WebCrypto / pkijs do NOT provide — that requires a certified GOST CSP and is
 * out of scope here (RSA test stands are supported).
 */

const OID_DATA = '1.2.840.113549.1.7.1';
const OID_SIGNED_DATA = '1.2.840.113549.1.7.2';
const OID_SHA256_RSA = '1.2.840.113549.1.1.11';

let engineReady = false;
function ensureEngine(): void {
  if (engineReady) return;
  const engine = new CryptoEngine({ name: 'node-webcrypto', crypto: webcrypto as unknown as Crypto });
  setEngine('node-webcrypto', engine, engine);
  engineReady = true;
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(Buffer.from(b64, 'base64')).buffer as ArrayBuffer;
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Produce a base64-encoded detached CMS SignedData over `data`. */
export async function signDetachedCms(data: Buffer, certPem: string, privateKeyPem: string): Promise<string> {
  ensureEngine();

  const certAsn1 = asn1js.fromBER(pemToDer(certPem));
  const certificate = new Certificate({ schema: certAsn1.result });

  const privateKey = await webcrypto.subtle.importKey(
    'pkcs8', pemToDer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );

  const signedData = new SignedData({
    version: 1,
    encapContentInfo: new EncapsulatedContentInfo({ eContentType: OID_DATA }), // detached: no eContent
    signerInfos: [
      new SignerInfo({
        version: 1,
        sid: new IssuerAndSerialNumber({ issuer: certificate.issuer, serialNumber: certificate.serialNumber }),
      }),
    ],
    certificates: [certificate],
  });

  await signedData.sign(privateKey, 0, 'SHA-256', toArrayBuffer(data));

  const cms = new ContentInfo({ contentType: OID_SIGNED_DATA, content: signedData.toSchema(true) });
  const der = cms.toSchema().toBER(false);
  return Buffer.from(der).toString('base64');
}

/** Verify a base64 detached CMS over `data` (used by tests; returns the signature validity). */
export async function verifyDetachedCms(cmsBase64: string, data: Buffer): Promise<boolean> {
  ensureEngine();
  const asn1 = asn1js.fromBER(toArrayBuffer(Buffer.from(cmsBase64, 'base64')));
  const contentInfo = new ContentInfo({ schema: asn1.result });
  const signedData = new SignedData({ schema: contentInfo.content });
  const result: unknown = await signedData.verify({ signer: 0, data: toArrayBuffer(data), checkChain: false });
  if (typeof result === 'boolean') return result;
  return Boolean((result as { signatureVerified?: boolean })?.signatureVerified);
}

export const _cmsOids = { OID_DATA, OID_SIGNED_DATA, OID_SHA256_RSA };
