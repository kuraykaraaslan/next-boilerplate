import Logger from '@kuraykaraaslan/logger';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import SamlMessages from './auth_saml.messages';

export type ImportedIdpMetadata = {
  idpEntityId: string | null;
  idpSsoUrl: string | null;
  idpSloUrl: string | null;
  idpCertificate: string | null;
};

/**
 * SAML IdP metadata auto-import (federation discovery). Fetches a published IdP
 * metadata XML document and extracts the EntityID, SSO/SLO endpoints, and signing
 * certificate so the admin form can be pre-filled.
 *
 * The XML is parsed with regular expressions rather than a full XML DOM: SAML
 * metadata is a flat, well-known structure and we only need four fields. This
 * keeps the module dependency-free of an XML parser. It is a documented seam —
 * for hardened federations (signed metadata, multiple IdP descriptors) a full
 * `@xmldom`/`xml-crypto` parse with signature verification would replace this.
 */
export default class AuthSamlMetadataService {

  static async importFromUrl(metadataUrl: string): Promise<ImportedIdpMetadata> {
    if (!metadataUrl || !/^https?:\/\//i.test(metadataUrl)) {
      throw new AppError(SamlMessages.METADATA_URL_REQUIRED, 400, ErrorCode.VALIDATION_ERROR);
    }
    let xml: string;
    try {
      const res = await fetch(metadataUrl, {
        headers: { Accept: 'application/samlmetadata+xml, application/xml, text/xml' },
        // Defend against a hung IdP metadata endpoint.
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    } catch (err) {
      Logger.warn(`[auth_saml] metadata import failed for ${metadataUrl}: ${err instanceof Error ? err.message : String(err)}`);
      throw new AppError(SamlMessages.METADATA_IMPORT_FAILED, 502, ErrorCode.VALIDATION_ERROR);
    }
    return AuthSamlMetadataService.parse(xml);
  }

  /** Extract the IdP fields from a metadata XML string. */
  static parse(xml: string): ImportedIdpMetadata {
    const idpEntityId = AuthSamlMetadataService.attr(xml, /<(?:[\w-]+:)?EntityDescriptor[^>]*\bentityID="([^"]+)"/i);

    // SingleSignOnService with HTTP-Redirect or HTTP-POST binding.
    const idpSsoUrl =
      AuthSamlMetadataService.bindingLocation(xml, 'SingleSignOnService', 'HTTP-Redirect') ??
      AuthSamlMetadataService.bindingLocation(xml, 'SingleSignOnService', 'HTTP-POST');

    const idpSloUrl =
      AuthSamlMetadataService.bindingLocation(xml, 'SingleLogoutService', 'HTTP-Redirect') ??
      AuthSamlMetadataService.bindingLocation(xml, 'SingleLogoutService', 'HTTP-POST');

    // First signing X509Certificate (fall back to any X509Certificate).
    const signing = xml.match(/<(?:[\w-]+:)?KeyDescriptor[^>]*use="signing"[\s\S]*?<(?:[\w-]+:)?X509Certificate>([\s\S]*?)<\/(?:[\w-]+:)?X509Certificate>/i);
    const anyCert = xml.match(/<(?:[\w-]+:)?X509Certificate>([\s\S]*?)<\/(?:[\w-]+:)?X509Certificate>/i);
    const certBody = (signing?.[1] ?? anyCert?.[1] ?? '').replace(/\s+/g, '');
    const idpCertificate = certBody
      ? `-----BEGIN CERTIFICATE-----\n${certBody.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`
      : null;

    return { idpEntityId, idpSsoUrl, idpSloUrl, idpCertificate };
  }

  private static attr(xml: string, re: RegExp): string | null {
    return xml.match(re)?.[1] ?? null;
  }

  private static bindingLocation(xml: string, service: string, binding: string): string | null {
    const re = new RegExp(
      `<(?:[\\w-]+:)?${service}[^>]*Binding="[^"]*${binding}"[^>]*Location="([^"]+)"`,
      'i',
    );
    const re2 = new RegExp(
      `<(?:[\\w-]+:)?${service}[^>]*Location="([^"]+)"[^>]*Binding="[^"]*${binding}"`,
      'i',
    );
    return xml.match(re)?.[1] ?? xml.match(re2)?.[1] ?? null;
  }
}
