# user_security module

User security and MFA management. Tracks OTP methods, TOTP secret, backup codes, last login metadata, failed attempts with auto-lockout, and WebAuthn passkeys.

---

## Files

| File | Purpose |
|---|---|
| `user_security.service.ts` | Core: get, update OTP/TOTP state, lockout logic |
| `user_security.passkey.service.ts` | WebAuthn registration and authentication |
| `user_security.passkey.constants.ts` | RP name, RP ID, expected origins |
| `user_security.passkey.messages.ts` | Passkey error/success strings |
| `user_security.types.ts` | `UserSecurity`, `SafeUserSecurity`, `StoredPasskey` |
| `user_security.enums.ts` | `OTPMethod`, `MFAStatus`, `OTPAction` enums |
| `user_security.setting.keys.ts` | Setting keys for lockout config |
| `entities/user_security.entity.ts` | TypeORM entity |
| `ui/user.passkeys-panel.tsx` | Passkey management UI |

---

## Lockout

After **5 consecutive failed login attempts**, the account is locked for **15 minutes**. Both thresholds are configurable via settings.

```typescript
import UserSecurityService from '@/modules/user_security/user_security.service';

// Record a failed attempt (auto-locks if threshold reached)
await UserSecurityService.recordFailedAttempt(userId);

// Check if locked
const { locked, lockedUntil } = await UserSecurityService.getLockoutStatus(userId);

// Clear after successful login
await UserSecurityService.clearFailedAttempts(userId);
```

---

## OTP Methods

```typescript
// Enable an OTP method
await UserSecurityService.enableOTPMethod(userId, 'EMAIL');

// Disable
await UserSecurityService.disableOTPMethod(userId, 'SMS');
```

---

## Passkeys (WebAuthn)

```typescript
import PasskeyService from '@/modules/user_security/user_security.passkey.service';

// Registration
const options = await PasskeyService.generateRegistrationOptions(userId);
const passkey = await PasskeyService.verifyRegistration(userId, response);

// Authentication
const options = await PasskeyService.generateAuthenticationOptions(userId);
await PasskeyService.verifyAuthentication(userId, response);
```

---

## API Routes

```
GET    /api/user/security
PUT    /api/user/security/otp
POST   /api/user/security/passkeys/register/options
POST   /api/user/security/passkeys/register/verify
POST   /api/user/security/passkeys/authenticate/options
POST   /api/user/security/passkeys/authenticate/verify
DELETE /api/user/security/passkeys/[id]
```
