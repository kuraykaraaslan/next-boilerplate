# Authentication

- **id:** `auth`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/auth/`
- **tags:** identity, auth, core
- **icon:** `fas fa-shield-halved`
- **hasNextLayer:** true

Credential auth: login, register, password reset, email verify, OTP, TOTP. Coordinates user, user_session, user_security, notification_mail.

## Dependencies

- **requires:** `user`, `user_session`, `user_security`, `notification_mail`, `env`, `redis`, `common`

## Services

- `auth.captcha.service.ts`
- `auth.otp.service.ts`
- `auth.password.service.ts`
- `auth.policy.service.ts`
- `auth.service.ts`
- `auth.totp.service.ts`

## DTOs

- `auth.dto.ts`

## Message keys

- `auth.messages.ts`

## Setting keys

- `auth.setting.keys.ts`

## Jobs

- `auth.dormant.job.ts`

## Owned API routes

- `tenant` GET `/tenant/[tenantId]/api/auth`
- `tenant` POST `/tenant/[tenantId]/api/auth/callback`
- `tenant` POST `/tenant/[tenantId]/api/auth/change-password`
- `tenant` GET `/tenant/[tenantId]/api/auth/csrf`
- `tenant` GET `/tenant/[tenantId]/api/auth/e-signature/countries`
- `tenant` POST `/tenant/[tenantId]/api/auth/e-signature/initiate`
- `tenant` GET `/tenant/[tenantId]/api/auth/e-signature/status/[transactionId]`
- `tenant` POST `/tenant/[tenantId]/api/auth/forgot-password`
- `tenant` GET/POST/DELETE `/tenant/[tenantId]/api/auth/impersonate`
- `tenant` POST `/tenant/[tenantId]/api/auth/login`
- `tenant` POST `/tenant/[tenantId]/api/auth/logout`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/device-info`
- `tenant` GET/DELETE `/tenant/[tenantId]/api/auth/me/notifications`
- `tenant` PUT/DELETE `/tenant/[tenantId]/api/auth/me/notifications/[notificationId]`
- `tenant` PUT `/tenant/[tenantId]/api/auth/me/notifications/read-all`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/notifications/stream`
- `tenant` GET/PUT `/tenant/[tenantId]/api/auth/me/preferences`
- `tenant` GET/PUT `/tenant/[tenantId]/api/auth/me/profile`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/security`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/sessions`
- `tenant` DELETE `/tenant/[tenantId]/api/auth/me/sessions/[sessionId]`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/social-accounts`
- `tenant` DELETE `/tenant/[tenantId]/api/auth/me/social-accounts/[provider]`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/social-accounts/connect/[provider]`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/social-accounts/connect/saml`
- `tenant` GET `/tenant/[tenantId]/api/auth/me/tenants`
- `tenant` POST `/tenant/[tenantId]/api/auth/otp/send`
- `tenant` POST `/tenant/[tenantId]/api/auth/otp/verify`
- `tenant` POST `/tenant/[tenantId]/api/auth/refresh`
- `tenant` POST `/tenant/[tenantId]/api/auth/register`
- `tenant` POST `/tenant/[tenantId]/api/auth/reset-password`
- `tenant` POST `/tenant/[tenantId]/api/auth/saml/callback`
- `tenant` GET `/tenant/[tenantId]/api/auth/saml/initiate`
- `tenant` GET `/tenant/[tenantId]/api/auth/saml/metadata`
- `tenant` GET `/tenant/[tenantId]/api/auth/saml/status`
- `tenant` GET `/tenant/[tenantId]/api/auth/session`
- `tenant` POST `/tenant/[tenantId]/api/auth/session/token-set`
- `tenant` GET `/tenant/[tenantId]/api/auth/sso`
- `tenant` GET `/tenant/[tenantId]/api/auth/sso/[provider]`
- `tenant` POST `/tenant/[tenantId]/api/auth/totp/disable`
- `tenant` POST `/tenant/[tenantId]/api/auth/totp/enable`
- `tenant` POST `/tenant/[tenantId]/api/auth/totp/setup`
- `tenant` POST `/tenant/[tenantId]/api/auth/verify-email/send`
- `tenant` POST `/tenant/[tenantId]/api/auth/verify-email/verify`

## Next layer (modules_next/) surface

- `auth/auth.admin-guard.next` _(ui)_
- `auth/ui/ESignatureLoginPanel` _(ui, client)_
- `auth/ui/ForgotPasswordForm` _(ui, client)_
- `auth/ui/LoginForm` _(ui, client)_
- `auth/ui/OAuthButtons` _(ui, client)_
- `auth/ui/RegisterForm` _(ui, client)_
- `auth/ui/SessionExpiredBanner` _(ui, client)_

## README

# auth module

Core authentication: login, registration, email verification, password management, OTP, and TOTP/2FA. Uses bcrypt and Redis for token TTLs.

---

## Files

| File | Purpose |
|---|---|
| `auth.service.ts` | Main orchestrator: login, register, email verify |
| `auth.otp.service.ts` | OTP generation, sending, and verification |
| `auth.password.service.ts` | Forgot password, reset password flows |
| `auth.totp.service.ts` | TOTP (authenticator app) setup and validation |
| `auth.dto.ts` | Zod DTOs for all auth flows |
| `auth.messages.ts` | Error/success message strings |
| `auth.scopes.ts` | Permission scope constants |
| `auth.setting.keys.ts` | Setting keys (OTP TTL, max attempts, etc.) |
| `dictionaries/en.json` | English localization |
| `dictionaries/es.json` | Spanish localization |
| `dictionaries/tr.json` | Turkish localization |
| `ui/auth.login.tsx` | Login form component |
| `ui/auth.register.tsx` | Registration form component |
| `ui/auth.forgot-password.tsx` | Forgot password form |
| `ui/auth.oauth-buttons.tsx` | SSO provider buttons |
| `ui/auth.session-expired.tsx` | Session expired modal |

---

## Auth Flows

### Login
```typescript
import AuthService from '@/modules/auth/auth.service';

const session = await AuthService.login({ email, password }, { ip, userAgent });
// Returns UserSession with access + refresh tokens
```

### Register
```typescript
const user = await AuthService.register({ email, password, name });
// Sends verification email automatically
```

### OTP (email/SMS one-time code)
```typescript
import AuthOTPService from '@/modules/auth/auth.otp.service';

await AuthOTPService.send(userId, 'LOGIN');
await AuthOTPService.verify(userId, code, 'LOGIN');
```

### TOTP (authenticator app)
```typescript
import AuthTOTPService from '@/modules/auth/auth.totp.service';

const { secret, qrCode } = await AuthTOTPService.setup(userId);
await AuthTOTPService.enable(userId, totpCode);
await AuthTOTPService.verify(userId, totpCode);
```

---

## API Routes

```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-email
POST /api/auth/otp/request
POST /api/auth/otp/verify
POST /api/auth/totp/setup
POST /api/auth/totp/enable
POST /api/auth/totp/verify
```
