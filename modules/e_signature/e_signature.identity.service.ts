import { createHash } from 'node:crypto';
import type {
  CountryCode,
  RawIdentityClaims,
  VerifiedIdentity,
} from './e_signature.types';
import type { LoA } from './e_signature.enums';

/**
 * Normalize provider-specific identity claims into an OIDC4IDA
 * `verified_claims`-shaped envelope. The plaintext national identifier is
 * **never** persisted; only its salted SHA-256 hash leaves this service.
 *
 * Reference: OpenID Connect for Identity Assurance 1.0
 * https://openid.net/specs/openid-connect-4-identity-assurance-1_0.html
 */
export default class ESignatureIdentityService {
  // ── National ID hashing ────────────────────────────────────────────────
  // We never store the plaintext national identifier. The hash is salted with
  // the country code so the same digits in two countries never collide.
  static hashNationalId(plaintext: string, country: CountryCode): string {
    return createHash('sha256').update(`${country}:${plaintext}`).digest('hex');
  }

  static normalize({
    raw,
    providerName,
    country,
    loa,
  }: {
    raw: RawIdentityClaims;
    providerName: string;
    country: CountryCode;
    loa: LoA;
  }): VerifiedIdentity {
    const nationalIdCountry: CountryCode = (raw.issuerCountry ?? country) as CountryCode;
    return {
      given_name: raw.givenName,
      family_name: raw.familyName,
      birth_date: raw.birthDate,
      national_id: raw.nationalId
        ? {
            country: nationalIdCountry,
            value_hash: ESignatureIdentityService.hashNationalId(raw.nationalId, nationalIdCountry),
          }
        : null,
      country,
      loa,
      provider: providerName,
      evidence: {
        type: 'electronic_signature',
        issuer_dn: raw.issuerDN,
        serial: raw.certSerialHex,
        fingerprint_sha256: raw.certFingerprintSha256,
        not_before: raw.notBefore,
        not_after: raw.notAfter,
      },
    };
  }
}
