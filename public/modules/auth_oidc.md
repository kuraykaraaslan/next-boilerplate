# OAuth2/OIDC Engine

- **id:** `auth_oidc`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/auth_oidc/`
- **tags:** identity, auth, oauth, oidc, engine
- **icon:** `fas fa-key`
- **hasNextLayer:** false

Generic, config-driven OAuth2/OIDC protocol engine (authorize → token → userinfo, PKCE, refresh, private_key_jwt, Basic confidential-client auth) plus a custom/bring-your-own OIDC provider. Consumed by auth_sso (social catalog) and auth_acs (government catalog); the OIDC analogue of auth_saml.

## Dependencies

- **requires:** `env`, `common`

## Message keys

- `auth_oidc.messages.ts`
