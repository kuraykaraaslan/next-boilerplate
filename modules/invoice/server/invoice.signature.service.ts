import 'reflect-metadata';
import { ESignatureDocumentService } from '@nb/e_signature';

/**
 * Invoice-specific facade over the platform's generic document-signing engine
 * (`ESignatureDocumentService` in the `e_signature` module). The actual XAdES /
 * XML-DSig signing logic lives there so it can be reused for any document
 * (contracts, archives, e-gov submissions, …); this wrapper just pins the
 * invoice seal certificate's setting keys.
 *
 * The tenant's seal is stored under `invoiceSigningKeyPem` / `invoiceSigningCertPem`
 * (AES-256-GCM encrypted at rest via the setting service's SENSITIVE_KEYS).
 */

const KEY_KEY = 'invoiceSigningKeyPem';
const CERT_KEY = 'invoiceSigningCertPem';

export default class InvoiceSignatureService {
  static hasSigningCert(tenantId: string): Promise<boolean> {
    return ESignatureDocumentService.hasSigningCert(tenantId, KEY_KEY, CERT_KEY);
  }

  static signXml(tenantId: string, xml: string, opts: { xpath?: string; prefix?: string } = {}): Promise<string> {
    return ESignatureDocumentService.signXml(tenantId, xml, { keyKey: KEY_KEY, certKey: CERT_KEY, ...opts });
  }

  static signXmlIfConfigured(tenantId: string, xml: string, opts: { xpath?: string; prefix?: string } = {}): Promise<{ xml: string; signed: boolean }> {
    return ESignatureDocumentService.signXmlIfConfigured(tenantId, xml, { keyKey: KEY_KEY, certKey: CERT_KEY, ...opts });
  }
}
