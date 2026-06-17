import 'reflect-metadata';
import { SignedXml } from 'xml-crypto';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import Logger from '@kuraykaraaslan/logger';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';

/**
 * Generic, reusable **document signing** for the platform — independent of the
 * mobile identity-challenge workflow in `e_signature.workflow.service.ts`.
 *
 * Any module that needs to cryptographically sign an XML document (e-invoices,
 * contracts, archived records, e-government submissions, …) uses this service.
 * It produces a real **enveloped XAdES-BES / XML-DSig** signature via
 * `xml-crypto` (RSA-SHA256, exclusive C14N, with the X.509 certificate embedded
 * in `KeyInfo/X509Data` so the result is self-contained and verifiable).
 *
 * The signing material (a private key + certificate, e.g. a qualified seal /
 * mali mühür) is supplied by the caller, either inline as PEM or by naming two
 * encrypted setting keys to read it from. There is no mock: either a real
 * cryptographic signature is produced, or the call fails / returns unsigned.
 */

export interface XmlSignOptions {
  /** Element to reference; defaults to the whole document (`/*`). */
  xpath?: string;
  /** Optional namespace prefix for the emitted `<Signature>` element. */
  prefix?: string;
}

export interface SettingsSignParams extends XmlSignOptions {
  /** Setting key holding the PEM private key (encrypted at rest). */
  keyKey: string;
  /** Setting key holding the PEM X.509 certificate (encrypted at rest). */
  certKey: string;
}

export default class ESignatureDocumentService {
  /**
   * Sign XML with explicit PEM material. Pure (no I/O). Throws
   * `DOCUMENT_SIGNING_FAILED` on any cryptographic error.
   */
  static signXmlWithKeys(xml: string, privateKey: string, publicCert: string, opts: XmlSignOptions = {}): string {
    try {
      const sig = new SignedXml({ privateKey, publicCert });
      sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
      sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
      sig.addReference({
        xpath: opts.xpath ?? '/*',
        transforms: [
          'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
          'http://www.w3.org/2001/10/xml-exc-c14n#',
        ],
        digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      });
      // Embed the signer certificate in KeyInfo/X509Data.
      sig.getKeyInfoContent = SignedXml.getKeyInfoContent;
      sig.computeSignature(xml, {
        prefix: opts.prefix,
        location: { reference: opts.xpath ?? '/*', action: 'append' },
      });
      return sig.getSignedXml();
    } catch (err) {
      Logger.error(`[ESignature.document] signing failed: ${err instanceof Error ? err.message : err}`);
      throw new AppError(E_SIGNATURE_MESSAGES.DOCUMENT_SIGNING_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /** Whether both signing-material setting keys are populated for the tenant. */
  static async hasSigningCert(tenantId: string, keyKey: string, certKey: string): Promise<boolean> {
    const [key, cert] = await Promise.all([
      SettingService.getValue(tenantId, keyKey),
      SettingService.getValue(tenantId, certKey),
    ]);
    return Boolean(key && cert);
  }

  /**
   * Sign XML using PEM material read from the tenant's encrypted settings.
   * Throws `DOCUMENT_SIGNING_CERT_MISSING` when not configured.
   */
  static async signXml(tenantId: string, xml: string, params: SettingsSignParams): Promise<string> {
    const [privateKey, publicCert] = await Promise.all([
      SettingService.getValue(tenantId, params.keyKey),
      SettingService.getValue(tenantId, params.certKey),
    ]);
    if (!privateKey || !publicCert) {
      throw new AppError(E_SIGNATURE_MESSAGES.DOCUMENT_SIGNING_CERT_MISSING, 422, ErrorCode.VALIDATION_ERROR);
    }
    return ESignatureDocumentService.signXmlWithKeys(xml, privateKey, publicCert, params);
  }

  /** Sign only when a certificate is configured; otherwise return XML unchanged. */
  static async signXmlIfConfigured(tenantId: string, xml: string, params: SettingsSignParams): Promise<{ xml: string; signed: boolean }> {
    if (!(await ESignatureDocumentService.hasSigningCert(tenantId, params.keyKey, params.certKey))) {
      return { xml, signed: false };
    }
    return { xml: await ESignatureDocumentService.signXml(tenantId, xml, params), signed: true };
  }
}
