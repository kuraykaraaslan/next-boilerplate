# National Identity Login

- **id:** `auth_acs`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/auth_acs/`
- **tags:** identity, auth, sso, saml, oidc, government
- **icon:** `fas fa-id-card`
- **hasNextLayer:** false

National/government digital-identity login (e-Devlet TR/KKTC, eIDAS, SPID, Cl@ve, DE eID, Login.gov, ID.me, OneID, MyGov ID). Registry of SAML + OIDC providers keyed on a hashed national identifier (no email), with synthetic-email JIT + account-merge and platform-level config via ACS_PROVIDER_MAP.

## Dependencies

- **requires:** `db`, `user`, `user_profile`, `user_social_account`, `user_session`, `user_security`, `tenant`, `tenant_member`, `auth_sso`, `auth_saml`, `auth_oidc`, `env`, `audit_log`, `observability`, `redis`, `common`, `logger`

## Services

- `auth_acs.config.service.ts`
- `auth_acs.flow.service.ts`
- `auth_acs.service.ts`

## Enums

- `auth_acs.enums.ts`

## Message keys

- `auth_acs.messages.ts`
