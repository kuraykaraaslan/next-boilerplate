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
