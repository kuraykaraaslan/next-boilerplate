import { z } from 'zod';
import { AcsProviderEnum, AcsProtocolEnum } from './auth_acs.enums';

/**
 * Normalised national-identity profile. Every provider (SAML or OIDC) maps its
 * raw assertion/claims into this shape. `nationalId` is the citizen identifier
 * (TCKN / fiscalNumber / DNI / PersonIdentifier / PINFL …); `nationalIdHash` is
 * the sha256 we actually persist — the raw id is never stored at rest.
 */
export const AcsProfileSchema = z.object({
  provider: AcsProviderEnum,
  country: z.string(),
  nationalId: z.string().min(1),
  nationalIdHash: z.string().length(64),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  nameId: z.string().nullable().optional(),
  assertionId: z.string().nullable().optional(),
  sessionIndex: z.string().nullable().optional(),
  /** ms epoch — from SAML SessionNotOnOrAfter / OIDC token exp; bounds replay TTL. */
  sessionNotOnOrAfter: z.number().nullable().optional(),
});

export type AcsProfile = z.infer<typeof AcsProfileSchema>;

/** Static, non-secret descriptor for a provider (the catalog entry). */
export interface AcsProviderDescriptor {
  provider: z.infer<typeof AcsProviderEnum>;
  protocol: z.infer<typeof AcsProtocolEnum>;
  /** ISO country (or 'EU' for the eIDAS node). Recorded on JIT-provisioned users. */
  country: string;
  /** Human label for the login button. */
  label: string;
  /** Default attribute / claim names carrying the identity fields. Overridable via env. */
  defaults: {
    attrNationalId: string;
    attrFirstName?: string;
    attrLastName?: string;
    nameIdFormat?: string;
    authUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    issuer?: string;
    scopes?: string[];
    usesPkce?: boolean;
  };
}

/** Resolved per-provider runtime config: catalog defaults merged with env secrets. */
export interface AcsResolvedConfig {
  provider: z.infer<typeof AcsProviderEnum>;
  protocol: z.infer<typeof AcsProtocolEnum>;
  country: string;
  enabled: boolean;
  allowJit: boolean;
  attrNationalId: string;
  attrFirstName: string;
  attrLastName: string;

  // SAML
  idpEntityId?: string;
  idpSsoUrl?: string;
  idpCertificate?: string;
  spEntityId?: string;
  spPrivateKey?: string;
  spCertificate?: string;
  spDecryptionKey?: string;
  nameIdFormat?: string;
  wantAssertionsSigned?: boolean;
  signatureAlgorithm?: string;
  loa?: string;

  // OIDC / OAuth2
  issuer?: string;
  jwksUri?: string;
  authUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  clientId?: string;
  clientSecret?: string;
  privateKeyJwt?: string;
  redirectUri?: string;
  scopes?: string[];
  usesPkce?: boolean;
  /** PEM cert + key used to PKCS#7-sign requests (Russia ESIA). */
  signingCert?: string;
  signingKey?: string;
}

/**
 * Shape of one entry in the ACS_PROVIDER_MAP JSON env var. Mirrors the existing
 * EID_PROVIDER_MAP convention: a single validated JSON blob keyed by provider.
 * All fields optional — only what a given provider needs must be supplied.
 */
export const AcsProviderEnvEntrySchema = z.object({
  enabled: z.boolean().optional(),
  allowJit: z.boolean().optional(),
  attrNationalId: z.string().optional(),
  attrFirstName: z.string().optional(),
  attrLastName: z.string().optional(),

  idpEntityId: z.string().optional(),
  idpSsoUrl: z.string().optional(),
  idpCertificate: z.string().optional(),
  spEntityId: z.string().optional(),
  spPrivateKey: z.string().optional(),
  spCertificate: z.string().optional(),
  spDecryptionKey: z.string().optional(),
  nameIdFormat: z.string().optional(),
  wantAssertionsSigned: z.boolean().optional(),
  signatureAlgorithm: z.string().optional(),
  loa: z.string().optional(),

  issuer: z.string().optional(),
  jwksUri: z.string().optional(),
  authUrl: z.string().optional(),
  tokenUrl: z.string().optional(),
  userInfoUrl: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  privateKeyJwt: z.string().optional(),
  redirectUri: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  usesPkce: z.boolean().optional(),
  signingCert: z.string().optional(),
  signingKey: z.string().optional(),
}).strict();

export const AcsProviderMapSchema = z.record(z.string(), AcsProviderEnvEntrySchema);
export type AcsProviderEnvEntry = z.infer<typeof AcsProviderEnvEntrySchema>;

/** Provider interface implemented by both the SAML and OIDC base classes. */
export interface AcsProviderService {
  readonly protocol: z.infer<typeof AcsProtocolEnum>;
  /** Build the redirect URL that starts authentication. relayState round-trips tenant context.
   *  SAML providers resolve async (node-saml); the OIDC engine returns synchronously — both awaited. */
  generateAuthUrl(relayState: string): Promise<string> | string;
  /** Validate the IdP callback and return the normalised national-identity profile. */
  validateCallback(body: Record<string, string>): Promise<AcsProfile>;
  /** SAML only: SP metadata XML for registration with the national authority. */
  generateMetadata?(): string;
}
