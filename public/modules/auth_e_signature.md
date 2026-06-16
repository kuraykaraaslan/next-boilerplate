# E-Signature Identity Login

- **id:** `auth_e_signature`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/auth_e_signature/`
- **tags:** auth, identity, signature, eidas
- **icon:** `fas fa-id-card`
- **hasNextLayer:** false

E-signature / e-identity login consumer: matches and binds qualified electronic-signature certificates (TR Mobil İmza, Smart-ID, BankID, eIDAS QSCD) to user accounts and runs the login/bind workflow. Consumes the e_signature engine for provider/crypto/identity primitives; owns the certificate↔user binding (signing_certificates).

## Dependencies

- **requires:** `db`, `e_signature`, `user`, `user_session`, `user_security`, `tenant`, `tenant_member`, `env`, `audit_log`, `webhook`, `redis`, `limiter`, `common`, `logger`

## TypeORM entities

- `SigningCertificate` (system) — `modules/auth_e_signature/server/entities/signing_certificate.entity.ts`
