import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import Logger from '@nb/logger';
import type { CountryCode } from './e_signature.types';

const HTTP_TIMEOUT_MS = 30_000;

export interface TslPointer {
  country: CountryCode;
  tslUrl: string;
  signingCertsBase64: string[];   // certs allowed to sign the pointed-to TSL
  mimeType?: string;
}

export interface TslEntry {
  country: CountryCode;
  certificatePem: string;
  serviceName?: string;
  status?: string;
}

/**
 * Parse + (optionally) XAdES-verify ETSI EU LOTL/TSL XML payloads.
 *
 * Trust model: the LOTL itself must be signed by a publicly listed "LOTL
 * Distribution Point" certificate (out-of-band). When that cert is supplied
 * via `trustedLotlSignerPem`, `parseLotl` performs full XAdES enveloped
 * signature verification before returning the pointers. When omitted, the
 * pointers are parsed without verification — callers should only do that in
 * non-production contexts.
 *
 * Per-country TSLs are XAdES-verified against the LOTL-declared signing
 * certs (`pointer.signingCertsBase64`) — they're the trust anchor for the
 * country's TSL contents.
 */
export default class ESignatureETSI_TSLService {
  private static readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
  });

  // ── LOTL ────────────────────────────────────────────────────────────────
  static async fetchLotl(url: string): Promise<string> {
    const { data } = await axios.get<string>(url, {
      responseType: 'text',
      timeout: HTTP_TIMEOUT_MS,
    });
    return data;
  }

  static parseLotl(xml: string, opts?: { trustedLotlSignerPem?: string }): { pointers: TslPointer[]; signatureVerified: boolean } {
    let signatureVerified = false;
    if (opts?.trustedLotlSignerPem) {
      signatureVerified = ESignatureETSI_TSLService.verifyEnvelopedXadesSignature(xml, [opts.trustedLotlSignerPem]);
      if (!signatureVerified) {
        Logger.warn('ETSI LOTL signature did not verify — refusing to ingest');
        return { pointers: [], signatureVerified: false };
      }
    }
    const pointers = ESignatureETSI_TSLService.extractLotlPointers(xml);
    return { pointers, signatureVerified };
  }

  // ── Per-country TSL ────────────────────────────────────────────────────
  static async fetchTsl(url: string): Promise<string> {
    const { data } = await axios.get<string>(url, {
      responseType: 'text',
      timeout: HTTP_TIMEOUT_MS,
    });
    return data;
  }

  static parseTsl(xml: string, country: CountryCode, opts?: { signingCertsBase64?: string[] }): { entries: TslEntry[]; signatureVerified: boolean } {
    let signatureVerified = false;
    if (opts?.signingCertsBase64 && opts.signingCertsBase64.length > 0) {
      const pems = opts.signingCertsBase64.map((b64) => ESignatureETSI_TSLService.toPem(b64));
      signatureVerified = ESignatureETSI_TSLService.verifyEnvelopedXadesSignature(xml, pems);
      if (!signatureVerified) {
        Logger.warn(`TSL for country ${country} did not verify — refusing to ingest`);
        return { entries: [], signatureVerified: false };
      }
    }
    const entries = ESignatureETSI_TSLService.extractTslEntries(xml, country);
    return { entries, signatureVerified };
  }

  // ── Internals ──────────────────────────────────────────────────────────
  private static extractLotlPointers(xml: string): TslPointer[] {
    const json = ESignatureETSI_TSLService.xmlParser.parse(xml) as Record<string, unknown>;
    const root = (json.TrustServiceStatusList ?? {}) as Record<string, unknown>;
    const schemeInformation = (root.SchemeInformation ?? {}) as Record<string, unknown>;
    const pointersWrapper = (schemeInformation.PointersToOtherTSL ?? {}) as Record<string, unknown>;
    const rawPointers = ESignatureETSI_TSLService.toArray(pointersWrapper.OtherTSLPointer);
    const out: TslPointer[] = [];
    for (const ptr of rawPointers) {
      const tslUrl = ESignatureETSI_TSLService.text((ptr as Record<string, unknown>).TSLLocation);
      const additionalInfoWrapper = ((ptr as Record<string, unknown>).AdditionalInformation ?? {}) as Record<string, unknown>;
      const additionalInfo = ESignatureETSI_TSLService.toArray(additionalInfoWrapper.OtherInformation);
      let country: CountryCode | undefined;
      let mimeType: string | undefined;
      for (const oi of additionalInfo) {
        const o = oi as Record<string, unknown>;
        if (o.SchemeTerritory && typeof o.SchemeTerritory === 'string') {
          country = o.SchemeTerritory.toUpperCase() as CountryCode;
        }
        if (o.MimeType && typeof o.MimeType === 'string') {
          mimeType = o.MimeType;
        }
      }
      // ServiceDigitalIdentity / DigitalId / X509Certificate
      const sdiWrapper = ((ptr as Record<string, unknown>).ServiceDigitalIdentities ?? {}) as Record<string, unknown>;
      const sdis = ESignatureETSI_TSLService.toArray(sdiWrapper.ServiceDigitalIdentity);
      const signingCerts: string[] = [];
      for (const sdi of sdis) {
        const digitalIds = ESignatureETSI_TSLService.toArray((sdi as Record<string, unknown>).DigitalId);
        for (const did of digitalIds) {
          const x509 = (did as Record<string, unknown>).X509Certificate;
          if (typeof x509 === 'string') signingCerts.push(x509.replace(/\s+/g, ''));
        }
      }
      if (country && tslUrl) {
        out.push({ country, tslUrl, signingCertsBase64: signingCerts, mimeType });
      }
    }
    return out;
  }

  private static extractTslEntries(xml: string, country: CountryCode): TslEntry[] {
    const json = ESignatureETSI_TSLService.xmlParser.parse(xml) as Record<string, unknown>;
    const root = (json.TrustServiceStatusList ?? {}) as Record<string, unknown>;
    const trustListWrapper = (root.TrustServiceProviderList ?? {}) as Record<string, unknown>;
    const tsps = ESignatureETSI_TSLService.toArray(trustListWrapper.TrustServiceProvider);
    const out: TslEntry[] = [];
    for (const tsp of tsps) {
      const tspServicesWrapper = ((tsp as Record<string, unknown>).TSPServices ?? {}) as Record<string, unknown>;
      const services = ESignatureETSI_TSLService.toArray(tspServicesWrapper.TSPService);
      for (const svc of services) {
        const info = ((svc as Record<string, unknown>).ServiceInformation ?? {}) as Record<string, unknown>;
        const status = ESignatureETSI_TSLService.text(info.ServiceStatus);
        const serviceName = ESignatureETSI_TSLService.text(
          ((info.ServiceName as Record<string, unknown> | undefined) ?? {}).Name,
        );
        const sdi = (info.ServiceDigitalIdentity ?? {}) as Record<string, unknown>;
        const digitalIds = ESignatureETSI_TSLService.toArray(sdi.DigitalId);
        for (const did of digitalIds) {
          const x509 = (did as Record<string, unknown>).X509Certificate;
          if (typeof x509 === 'string' && x509.trim()) {
            out.push({
              country,
              certificatePem: ESignatureETSI_TSLService.toPem(x509.replace(/\s+/g, '')),
              serviceName,
              status,
            });
          }
        }
      }
    }
    return out;
  }

  private static verifyEnvelopedXadesSignature(xml: string, allowedSignerPems: string[]): boolean {
    try {
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const sigNode = doc.getElementsByTagNameNS(
        'http://www.w3.org/2000/09/xmldsig#',
        'Signature',
      )[0];
      if (!sigNode) {
        Logger.warn('XAdES enveloped signature node not found');
        return false;
      }
      const sig = new SignedXml({
        publicCert: allowedSignerPems[0],
      });
      // xml-crypto wants the DOM Node; cast through unknown to bridge the
      // @xmldom Element vs lib.dom Node type mismatch (same runtime shape).
      sig.loadSignature(sigNode as unknown as Node);
      const ok = sig.checkSignature(xml);
      return ok;
    } catch (err) {
      Logger.warn(`XAdES verification threw: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }

  private static toArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
  }

  private static text(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      const v = value as Record<string, unknown>;
      if (typeof v['#text'] === 'string') return v['#text'];
    }
    return undefined;
  }

  private static toPem(base64: string): string {
    const cleaned = base64.replace(/\s+/g, '');
    const lines = cleaned.match(/.{1,64}/g) ?? [cleaned];
    return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
  }
}
