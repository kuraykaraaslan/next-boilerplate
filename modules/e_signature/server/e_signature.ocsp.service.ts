import axios from 'axios';
import * as asn1js from 'asn1js';
import {
  BasicOCSPResponse,
  CertID,
  Certificate as PkijsCertificate,
  OCSPRequest,
  OCSPResponse,
  Request,
  TBSRequest,
  setEngine,
  CryptoEngine,
} from 'pkijs';
import { webcrypto } from 'node:crypto';
import Logger from '@nb/logger';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';

const OCSP_HTTP_TIMEOUT_MS = 10_000;
const OCSP_CONTENT_TYPE_REQUEST = 'application/ocsp-request';
const OCSP_CONTENT_TYPE_RESPONSE = 'application/ocsp-response';

// pkijs uses WebCrypto; in Node ≥18 webcrypto is available on `node:crypto`.
// Install once at module load — setEngine is idempotent.
setEngine('node-webcrypto', new CryptoEngine({
  name: 'node-webcrypto',
  crypto: webcrypto as unknown as Crypto,
  subtle: webcrypto.subtle as unknown as SubtleCrypto,
}));

export type OCSPStatus = 'good' | 'revoked' | 'unknown';

export interface OCSPCheckResult {
  status: OCSPStatus;
  responderUrl?: string;
  revocationTime?: Date;
  revocationReason?: number;
  producedAt?: Date;
  thisUpdate?: Date;
  nextUpdate?: Date;
}

export default class ESignatureOCSPService {
  /**
   * Build an OCSP request for `leafDer` whose issuer is `issuerDer`, POST it
   * to the AIA OCSP responder URL embedded in the leaf certificate (or the
   * caller-supplied override), and return a normalized status.
   *
   * Soft-fails (returns `unknown`) on any transport-level error. The caller
   * decides whether to treat `unknown` as deny or allow.
   */
  static async check({
    leafDer,
    issuerDer,
    responderUrlOverride,
  }: {
    leafDer: Buffer;
    issuerDer: Buffer;
    responderUrlOverride?: string;
  }): Promise<OCSPCheckResult> {
    const leaf = ESignatureOCSPService.parsePkijs(leafDer);
    const issuer = ESignatureOCSPService.parsePkijs(issuerDer);

    const responderUrl = responderUrlOverride ?? ESignatureOCSPService.extractOcspUrl(leaf);
    if (!responderUrl) return { status: 'unknown' };

    let requestBytes: ArrayBuffer;
    try {
      requestBytes = await ESignatureOCSPService.buildRequest(leaf, issuer);
    } catch (err) {
      Logger.warn(`ocsp request build failed: ${err instanceof Error ? err.message : err}`);
      return { status: 'unknown', responderUrl };
    }

    let raw: ArrayBuffer;
    try {
      const res = await axios.post<ArrayBuffer>(responderUrl, Buffer.from(requestBytes), {
        responseType: 'arraybuffer',
        timeout: OCSP_HTTP_TIMEOUT_MS,
        headers: {
          'Content-Type': OCSP_CONTENT_TYPE_REQUEST,
          Accept: OCSP_CONTENT_TYPE_RESPONSE,
        },
      });
      raw = res.data;
    } catch (err) {
      Logger.warn(`ocsp http call failed (${responderUrl}): ${err instanceof Error ? err.message : err}`);
      return { status: 'unknown', responderUrl };
    }

    try {
      return await ESignatureOCSPService.parseAndVerifyResponse(raw, issuer, responderUrl);
    } catch (err) {
      Logger.warn(`ocsp response parse/verify failed: ${err instanceof Error ? err.message : err}`);
      return { status: 'unknown', responderUrl };
    }
  }

  // ── internals ───────────────────────────────────────────────────────────
  private static parsePkijs(der: Buffer): PkijsCertificate {
    const ab = der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer;
    const asn1 = asn1js.fromBER(ab);
    if (asn1.offset === -1) throw new AppError(E_SIGNATURE_MESSAGES.CERT_DER_DECODE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    return new PkijsCertificate({ schema: asn1.result });
  }

  private static extractOcspUrl(cert: PkijsCertificate): string | undefined {
    // Authority Information Access (1.3.6.1.5.5.7.1.1)
    const aia = cert.extensions?.find((e) => e.extnID === '1.3.6.1.5.5.7.1.1');
    if (!aia?.parsedValue) return undefined;
    // pkijs surfaces accessDescriptions on the parsed extension.
    const access = (aia.parsedValue as { accessDescriptions?: Array<{ accessMethod: string; accessLocation: { value: string } }> })
      .accessDescriptions ?? [];
    const ocsp = access.find((a) => a.accessMethod === '1.3.6.1.5.5.7.48.1'); // id-ad-ocsp
    return ocsp?.accessLocation?.value;
  }

  private static async buildRequest(leaf: PkijsCertificate, issuer: PkijsCertificate): Promise<ArrayBuffer> {
    const certID = new CertID();
    await certID.createForCertificate(leaf, {
      hashAlgorithm: 'SHA-1',  // OCSP defaults still standardize on SHA-1 for CertID
      issuerCertificate: issuer,
    });
    const request = new Request({ reqCert: certID });
    const tbs = new TBSRequest({ requestList: [request] });
    const ocspReq = new OCSPRequest({ tbsRequest: tbs });
    return ocspReq.toSchema(true).toBER(false);
  }

  private static async parseAndVerifyResponse(
    raw: ArrayBuffer,
    issuer: PkijsCertificate,
    responderUrl: string,
  ): Promise<OCSPCheckResult> {
    const asn1 = asn1js.fromBER(raw);
    if (asn1.offset === -1) throw new AppError(E_SIGNATURE_MESSAGES.OCSP_RESPONSE_DECODE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    const ocspResp = new OCSPResponse({ schema: asn1.result });

    const responseStatus = ocspResp.responseStatus.valueBlock.valueDec;
    if (responseStatus !== 0) {
      // 1 malformedRequest, 2 internalError, 3 tryLater, 5 sigRequired, 6 unauthorized
      return { status: 'unknown', responderUrl };
    }

    const responseBytes = ocspResp.responseBytes;
    if (!responseBytes) return { status: 'unknown', responderUrl };

    // The inner response is itself a DER-encoded BasicOCSPResponse.
    const inner = responseBytes.response.valueBlock.valueHexView;
    const innerAb = inner.buffer.slice(inner.byteOffset, inner.byteOffset + inner.byteLength) as ArrayBuffer;
    const innerAsn = asn1js.fromBER(innerAb);
    if (innerAsn.offset === -1) return { status: 'unknown', responderUrl };

    const basic = new BasicOCSPResponse({ schema: innerAsn.result });

    // ── Verify responder signature ────────────────────────────────────────
    // The responder is either the issuer itself, or a delegated signer
    // whose cert is embedded in `basic.certs` and chains to `issuer` with
    // id-kp-OCSPSigning EKU. pkijs's `BasicOCSPResponse.verify({ trustedCerts })`
    // handles both cases and returns true only on a successful crypto check.
    let signatureOk = false;
    try {
      signatureOk = await basic.verify({ trustedCerts: [issuer] });
    } catch (err) {
      Logger.warn(`ocsp responder signature verify threw: ${err instanceof Error ? err.message : err}`);
      signatureOk = false;
    }
    if (!signatureOk) {
      Logger.warn(`ocsp responder signature did not verify against issuer ${issuer.subject.typesAndValues.map((t) => `${t.type}=${t.value.valueBlock.value}`).join(',')}`);
      return { status: 'unknown', responderUrl };
    }

    const producedAt = basic.tbsResponseData.producedAt;
    const single = basic.tbsResponseData.responses[0];
    if (!single) return { status: 'unknown', responderUrl, producedAt };

    const certStatus = single.certStatus;
    const thisUpdate = single.thisUpdate;
    const nextUpdate = single.nextUpdate;

    // CHOICE encoded with context tags: [0] good, [1] revoked, [2] unknown
    const tag = certStatus.idBlock.tagNumber;
    if (tag === 0) {
      return { status: 'good', responderUrl, producedAt, thisUpdate, nextUpdate };
    }
    if (tag === 1) {
      const revoked = certStatus as asn1js.Sequence;
      const revocationTime = revoked.valueBlock.value[0] as asn1js.GeneralizedTime | undefined;
      const reasonNode = revoked.valueBlock.value[1] as { valueBlock?: { valueDec?: number } } | undefined;
      return {
        status: 'revoked',
        responderUrl,
        producedAt,
        thisUpdate,
        nextUpdate,
        revocationTime: revocationTime?.toDate(),
        revocationReason: reasonNode?.valueBlock?.valueDec,
      };
    }
    return { status: 'unknown', responderUrl, producedAt, thisUpdate, nextUpdate };
  }
}
