export const SAML_NAME_ID_FORMATS = {
  EMAIL: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  PERSISTENT: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
  TRANSIENT: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
  UNSPECIFIED: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
} as const;

export type SamlNameIdFormat = (typeof SAML_NAME_ID_FORMATS)[keyof typeof SAML_NAME_ID_FORMATS];
