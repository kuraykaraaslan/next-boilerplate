import { z } from 'zod';
import {
  LoAEnum,
  ProviderCapabilityEnum,
  TransactionStatusEnum,
  PollResultStatusEnum,
  FailureReasonEnum,
} from './e_signature.enums';

// ── ISO 3166-1 alpha-2 country code ────────────────────────────────────────
export const CountryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Country must be ISO 3166-1 alpha-2');
export type CountryCode = z.infer<typeof CountryCodeSchema>;

// ── Identifier (provider-specific shape; validated by provider.validateIdentifier)
export const IdentifierSchema = z.string().min(1).max(256);
export type Identifier = z.infer<typeof IdentifierSchema>;

// ── Redis transaction record ───────────────────────────────────────────────
export const TransactionRecordSchema = z.object({
  transactionId: z.string().uuid(),
  providerName: z.string(),
  providerTxnId: z.string(),
  country: CountryCodeSchema,
  identifier: IdentifierSchema,
  challenge: z.string(),
  ip: z.string().nullable(),
  ua: z.string().nullable(),
  status: TransactionStatusEnum,
  purpose: z.enum(['login', 'bind', 'sign']),
  initiatingUserId: z.string().uuid().nullable(),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.number(),
  expiresAt: z.number(),
});
export type TransactionRecord = z.infer<typeof TransactionRecordSchema>;

// ── Provider poll result (lifted from provider into service-level shape) ───
export const PollResultSchema = z.object({
  status: PollResultStatusEnum,
  signature: z.instanceof(Buffer).optional(),
  certificate: z.instanceof(Buffer).optional(), // DER bytes
  providerClaims: z.unknown().optional(),
  failureReason: FailureReasonEnum.optional(),
});
export type PollResult = z.infer<typeof PollResultSchema>;

// ── Raw claims as produced by a provider (pre-normalization) ───────────────
export const RawIdentityClaimsSchema = z.object({
  commonName: z.string().nullable(),
  givenName: z.string().nullable(),
  familyName: z.string().nullable(),
  serialNumber: z.string().nullable(),     // X.509 Subject serialNumber
  nationalId: z.string().nullable(),       // Plain — must be hashed before persistence
  birthDate: z.string().nullable(),        // ISO 8601 (YYYY-MM-DD) when known
  issuerDN: z.string(),
  issuerCountry: CountryCodeSchema.nullable(),
  certSerialHex: z.string(),
  certFingerprintSha256: z.string(),       // hex
  notBefore: z.string(),                   // ISO 8601
  notAfter: z.string(),                    // ISO 8601
});
export type RawIdentityClaims = z.infer<typeof RawIdentityClaimsSchema>;

// ── OIDC4IDA verified_claims-shaped identity ───────────────────────────────
// Reference: https://openid.net/specs/openid-connect-4-identity-assurance-1_0.html
export const VerifiedIdentitySchema = z.object({
  given_name: z.string().nullable(),
  family_name: z.string().nullable(),
  birth_date: z.string().nullable(),
  national_id: z
    .object({
      country: CountryCodeSchema,
      value_hash: z.string(), // sha256 hex of the plaintext national id
    })
    .nullable(),
  country: CountryCodeSchema,
  loa: LoAEnum,
  provider: z.string(),
  evidence: z.object({
    type: z.literal('electronic_signature'),
    issuer_dn: z.string(),
    serial: z.string(),
    fingerprint_sha256: z.string(),
    not_before: z.string(),
    not_after: z.string(),
  }),
});
export type VerifiedIdentity = z.infer<typeof VerifiedIdentitySchema>;

// ── Country picker UI hint (returned by GET /countries) ────────────────────
export const CountryHintSchema = z.object({
  country: CountryCodeSchema,
  providers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      identifierLabel: z.string(),
      identifierPlaceholder: z.string().optional(),
      identifierPattern: z.string().optional(), // human-readable hint
      capabilities: z.array(ProviderCapabilityEnum),
      loa: LoAEnum,
    }),
  ),
});
export type CountryHint = z.infer<typeof CountryHintSchema>;

// ── Bound certificate (persisted) ──────────────────────────────────────────
export const BoundCertificateSchema = z.object({
  signingCertificateId: z.string().uuid(),
  userId: z.string().uuid(),
  providerName: z.string(),
  country: CountryCodeSchema,
  certFingerprintSha256: z.string(),
  certSerialHex: z.string(),
  issuerDN: z.string(),
  subjectDN: z.string(),
  commonName: z.string().nullable(),
  nationalIdHash: z.string().nullable(),
  loa: LoAEnum,
  notBefore: z.date(),
  notAfter: z.date(),
  boundAt: z.date(),
  lastUsedAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
});
export type BoundCertificate = z.infer<typeof BoundCertificateSchema>;

// ── Trust list entry (persisted) ───────────────────────────────────────────
export const TrustListEntrySchema = z.object({
  trustListEntryId: z.string().uuid(),
  country: CountryCodeSchema,
  issuerDN: z.string(),
  certificatePem: z.string(),
  subjectKeyIdentifier: z.string().nullable(),
  notBefore: z.date(),
  notAfter: z.date(),
  source: z.enum(['etsi_lotl', 'tr_kamusm', 'manual']),
  fetchedAt: z.date(),
});
export type TrustListEntry = z.infer<typeof TrustListEntrySchema>;
