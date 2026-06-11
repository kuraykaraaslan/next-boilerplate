export const SAML_NAME_ID_FORMATS = {
  EMAIL: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  PERSISTENT: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
  TRANSIENT: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
  UNSPECIFIED: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
} as const;

export type SamlNameIdFormat = (typeof SAML_NAME_ID_FORMATS)[keyof typeof SAML_NAME_ID_FORMATS];

// XML-DSig signature algorithms understood by @node-saml/node-saml. Exposed
// per-tenant so each IdP's signature requirement can be matched (legacy IdPs
// → sha1; high-assurance / future IdPs → sha512).
export const SAML_SIGNATURE_ALGORITHMS = ['sha1', 'sha256', 'sha512'] as const;
export type SamlSignatureAlgorithm = (typeof SAML_SIGNATURE_ALGORITHMS)[number];

// Match modes for an ABAC role-mapping rule. `equals`/`contains` compare the
// raw attribute value; `dnEquals` matches a single RDN inside a full DN string
// (e.g. `CN=App-Admins` inside `CN=App-Admins,OU=Groups,DC=corp,DC=com`).
export const SAML_ROLE_RULE_MATCHES = ['equals', 'contains', 'dnEquals', 'regex'] as const;
export type SamlRoleRuleMatch = (typeof SAML_ROLE_RULE_MATCHES)[number];
