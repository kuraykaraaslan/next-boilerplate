# Architecture Documentation

## 1. Project Overview

| Property | Value |
|---|---|
| **Framework** | Next.js 16.1.2 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Database** | PostgreSQL + Prisma ORM 7.3 |
| **Cache / Queue** | Redis + BullMQ |
| **Auth** | JWT + bcrypt + OTP/TOTP/SSO |
| **Architecture** | Multi-tenant SaaS (path-based & subdomain tenancy) |
| **Styling** | TailwindCSS 4 + DaisyUI |
| **Icons** | FontAwesome |
| **Logging** | Winston |

---

## 2. Directory Structure

```
/
├── app/
│   ├── system/                        # System-level (global admin) routes
│   │   ├── api/                       # System API endpoints
│   │   ├── admin/                     # Admin dashboard pages
│   │   └── auth/                      # Auth pages (login, register, etc.)
│   └── tenant/[tenantId]/             # Tenant-specific routes
│       ├── api/                       # Tenant API endpoints
│       ├── auth/                      # Tenant auth pages
│       ├── admin/                     # Tenant admin pages
│       └── api-docs/                  # API documentation
├── modules/                           # Business logic layer (services, DTOs, types)
│   ├── auth/
│   ├── auth_sso/
│   ├── user/
│   ├── user_profile/
│   ├── user_preferences/
│   ├── user_security/
│   ├── user_session/
│   ├── user_social_account/
│   ├── user_agent/
│   ├── tenant/
│   ├── tenant_member/
│   ├── tenant_invitation/
│   ├── tenant_domain/
│   ├── tenant_subscription/
│   ├── tenant_branding/
│   ├── tenant_setting/
│   ├── tenant_session/
│   ├── payment/
│   ├── notification_mail/
│   ├── notification_sms/
│   ├── storage/
│   ├── setting/
│   ├── ai/
│   ├── ui/
│   └── module.types.ts
├── libs/                              # Shared infrastructure libraries
│   ├── prisma/                        # Prisma client singleton
│   ├── logger/                        # Winston logger
│   ├── redis/                         # Redis / ioredis client
│   ├── limiter/                       # Rate limiter
│   ├── s3/                            # S3-compatible client
│   ├── axios/                         # HTTP client
│   └── zustand/                       # Frontend state stores
├── prisma/
│   ├── schema/                        # Modular Prisma schema files
│   ├── migrations/
│   └── seed.ts
├── components/                        # Shared React components
├── public/                            # Static assets
├── scripts/                           # Build / utility scripts
├── logs/                              # Winston log files (auto-created)
├── proxy.ts                           # Multi-tenancy proxy middleware
├── next.config.ts
├── prisma.config.ts
├── tsconfig.json
└── global.d.ts
```

---

## 3. Prisma Data Models

### 3.1 Enums (`prisma/schema/enums.prisma`)

#### User Enums
| Enum | Values |
|---|---|
| `UserRole` | `USER`, `ADMIN` |
| `UserStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |

#### Tenant Enums
| Enum | Values |
|---|---|
| `TenantStatus` | `ACTIVE`, `INACTIVE`, `PENDING`, `SUSPENDED`, `DELETED`, `ARCHIVED` |
| `TenantMemberRole` | `OWNER`, `ADMIN`, `USER` |
| `TenantMemberStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED`, `PENDING` |
| `DomainStatus` | `ACTIVE`, `INACTIVE`, `PENDING`, `VERIFIED` |

#### User Preferences Enums
| Enum | Values |
|---|---|
| `Theme` | `LIGHT`, `DARK`, `SYSTEM` |
| `Language` | `EN`, `ES`, `FR`, `DE`, `CN`, `JP` |
| `DateFormat` | `DD_MM_YYYY`, `MM_DD_YYYY` |
| `TimeFormat` | `H24`, `H12` |
| `FirstDayOfWeek` | `MON`, `SUN` |

#### Auth / Security Enums
| Enum | Values |
|---|---|
| `OTPMethod` | `EMAIL`, `SMS`, `TOTP_APP` |
| `SessionStatus` | `ACTIVE`, `EXPIRED`, `REVOKED` |
| `TenantInvitationStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `REVOKED` |

#### Payment Enums
| Enum | Values |
|---|---|
| `PaymentStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CANCELLED`, `EXPIRED` |
| `PaymentProvider` | `STRIPE`, `PAYPAL`, `IYZICO` |
| `PaymentMethod` | `CREDIT_CARD`, `DEBIT_CARD`, `BANK_TRANSFER`, `PAYPAL`, `APPLE_PAY`, `GOOGLE_PAY`, `OTHER` |
| `TransactionType` | `PAYMENT`, `REFUND`, `CHARGEBACK`, `PAYOUT` |
| `TransactionStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED` |

#### Subscription Enums
| Enum | Values |
|---|---|
| `SubscriptionPlanStatus` | `ACTIVE`, `INACTIVE`, `ARCHIVED` |
| `SubscriptionStatus` | `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`, `TRIALING` |
| `BillingInterval` | `MONTHLY`, `YEARLY` |
| `PlanFeatureType` | `BOOLEAN`, `LIMIT` |

#### Social Provider Enum
`SocialAccountProvider`: `google`, `apple`, `facebook`, `github`, `linkedin`, `microsoft`, `twitter`, `slack`, `tiktok`, `wechat`, `autodesk`

---

### 3.2 Core Models

#### `User` (`user.prisma`)
| Field | Type | Notes |
|---|---|---|
| `userId` | UUID (PK) | |
| `email` | String (unique) | |
| `phone` | String? | |
| `password` | String | bcrypt hashed |
| `userRole` | `UserRole` | |
| `userStatus` | `UserStatus` | |
| `createdAt` / `updatedAt` / `deletedAt` | DateTime | Soft delete |

Relations: `profile`, `security`, `preferences`, `socialAccounts`, `sessions`, `tenantMembers`, `payments`

---

#### `UserProfile` (`user_profile.prisma`)
| Field | Type | Notes |
|---|---|---|
| `userProfileId` | UUID (PK) | |
| `userId` | UUID (FK, unique) | |
| `name` | String | |
| `biography` | Text? | |
| `profilePicture` | String? | |
| `headerImage` | String? | |
| `socialLinks` | JSONB[] | Array of social link objects |

---

#### `UserSecurity` (`user_security.prisma`)
| Field | Type | Notes |
|---|---|---|
| `userSecurityId` | UUID (PK) | |
| `userId` | UUID (FK, unique) | |
| `otpMethods` | `OTPMethod[]` | Enabled 2FA methods |
| `otpSecret` | String? | TOTP secret (encrypted) |
| `otpBackupCodes` | JSONB[] | Hashed backup codes |
| `lastLoginAt` / `lastLoginIp` / `lastLoginDevice` | DateTime / String | |
| `failedLoginAttempts` | Int | |
| `lockedUntil` | DateTime? | Account lockout |

---

#### `UserSession` (`user_session.prisma`)
| Field | Type | Notes |
|---|---|---|
| `userSessionId` | UUID (PK) | |
| `userId` | UUID (FK) | |
| `accessToken` | Text | SHA-256 hashed |
| `refreshToken` | Text | SHA-256 hashed |
| `deviceFingerprint` | String | SHA-256(IP+UA+Language) |
| `userAgent` / `ipAddress` | String | |
| `sessionStatus` | `SessionStatus` | |
| `otpVerifyNeeded` | Boolean | |
| `sessionExpiry` | DateTime | Default: 7 days |

---

#### `UserPreferences` (`user_preferences.prisma`)
| Field | Type | Notes |
|---|---|---|
| `userPreferencesId` | UUID (PK) | |
| `userId` | UUID (FK, unique) | |
| `theme` | `Theme` | |
| `language` | `Language` | |
| `timezone` | String | |
| `dateFormat` / `timeFormat` / `firstDayOfWeek` | enums | |
| `emailNotifications` / `smsNotifications` / `pushNotifications` / `newsletter` | Boolean | |

---

#### `UserSocialAccount` (`user_social_account.prisma`)
| Field | Type | Notes |
|---|---|---|
| `userSocialAccountId` | UUID (PK) | |
| `userId` | UUID (FK) | |
| `provider` | `SocialAccountProvider` | |
| `providerId` | String | |
| `accessToken` / `refreshToken` | Text? | |
| `profilePicture` | String? | |

Unique constraint: `[provider, providerId]`

---

#### `Tenant` (`tenant.prisma`)
| Field | Type | Notes |
|---|---|---|
| `tenantId` | UUID (PK) | |
| `name` | String | |
| `description` | Text? | |
| `tenantStatus` | `TenantStatus` | |
| `createdAt` / `updatedAt` / `deletedAt` | DateTime | Soft delete |

Relations: `domains`, `members`, `payments`, `subscription`

---

#### `TenantMember` (`tenant_member.prisma`)
| Field | Type | Notes |
|---|---|---|
| `tenantMemberId` | UUID (PK) | |
| `tenantId` | UUID (FK) | |
| `userId` | UUID (FK) | |
| `memberRole` | `TenantMemberRole` | OWNER > ADMIN > USER |
| `memberStatus` | `TenantMemberStatus` | |
| `deletedAt` | DateTime? | Soft delete |

Unique constraint: `[tenantId, userId]`

---

#### `TenantInvitation` (`tenant_invitation.prisma`)
| Field | Type | Notes |
|---|---|---|
| `invitationId` | UUID (PK) | |
| `tenantId` | UUID (FK) | |
| `email` | String | Invited email (may not have an account) |
| `invitedByUserId` | UUID (FK) | User who sent the invitation |
| `memberRole` | `TenantMemberRole` | Role to assign on acceptance |
| `token` | String (unique) | SHA-256 hashed — never exposed |
| `status` | `TenantInvitationStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `REVOKED` |
| `expiresAt` | DateTime | Default: 7 days (`INVITATION_TTL_SECONDS` env) |
| `createdAt` / `updatedAt` | DateTime | |

Relations: `tenant` (→ `Tenant`), `invitedBy` (→ `User`)

Token is stored as SHA-256 hash — raw token only returned at send time and delivered via email link.
Expiry TTL configurable via `INVITATION_TTL_SECONDS` env (default: 7 days).

---

#### `TenantDomain` (`tenant_domain.prisma`)
| Field | Type | Notes |
|---|---|---|
| `tenantDomainId` | UUID (PK) | |
| `tenantId` | UUID (FK) | |
| `domain` | String (unique) | |
| `isPrimary` | Boolean | |
| `domainStatus` | `DomainStatus` | |
| `verificationToken` | String? | DNS TXT record |
| `verifiedAt` | DateTime? | |

---

#### `Setting` (`setting.prisma`)
| Field | Type | Notes |
|---|---|---|
| `tenantId` + `key` | Composite PK | |
| `value` | Text | |
| `group` | String | Default: `"general"` |
| `type` | String | Default: `"string"` |

System tenant ID: `00000000-0000-0000-0000-000000000000`

---

#### `Payment` (`payment.prisma`)
| Field | Type | Notes |
|---|---|---|
| `paymentId` | UUID (PK) | |
| `userId` / `tenantId` | UUID? (FK) | Optional association |
| `provider` | `PaymentProvider` | |
| `providerPaymentId` | String | |
| `amount` / `refundedAmount` | Decimal(12,2) | |
| `currency` | String | ISO 4217 |
| `status` / `paymentMethod` | enums | |
| `customerEmail` / `customerName` / `customerPhone` | String? | |
| `billingAddress` / `metadata` | JSONB? | |
| `failureCode` / `failureMessage` | String? / Text? | |
| `paidAt` / `cancelledAt` / `refundedAt` / `expiresAt` | DateTime? | |

---

#### `PaymentTransaction` (`payment_transaction.prisma`)
| Field | Type | Notes |
|---|---|---|
| `transactionId` | UUID (PK) | |
| `paymentId` | UUID (FK) | |
| `provider` / `type` / `status` | enums | |
| `providerTransactionId` | String | |
| `amount` / `fee` / `net` | Decimal(12,2) | |
| `currency` | String | |
| `providerResponse` | JSONB? | |
| `parentTransactionId` | UUID? (FK) | For refunds |
| `ipAddress` / `userAgent` | String? / Text? | |

---

#### `SubscriptionPlan` (`subscription_plan.prisma`)
| Field | Type | Notes |
|---|---|---|
| `planId` | UUID (PK) | |
| `name` | String | |
| `monthlyPrice` / `yearlyPrice` | Decimal(12,2) | |
| `currency` | String | Default: `"USD"` |
| `trialDays` | Int | |
| `isDefault` | Boolean | |
| `sortOrder` | Int | |
| `status` | `SubscriptionPlanStatus` | |

---

#### `PlanFeature` (`plan_feature.prisma`)
| Field | Type | Notes |
|---|---|---|
| `featureId` | UUID (PK) | |
| `planId` | UUID (FK) | |
| `key` / `label` | String | |
| `type` | `PlanFeatureType` | `BOOLEAN` or `LIMIT` |
| `value` | String | `"true"/"false"` or number / `"-1"` for unlimited |
| `sortOrder` | Int | |

Unique constraint: `[planId, key]`

---

#### `TenantSubscription` (`tenant_subscription.prisma`)
| Field | Type | Notes |
|---|---|---|
| `subscriptionId` | UUID (PK) | |
| `tenantId` | UUID (FK, unique) | One subscription per tenant |
| `planId` | UUID (FK) | |
| `status` | `SubscriptionStatus` | |
| `billingInterval` | `BillingInterval` | |
| `currentPeriodStart` / `currentPeriodEnd` | DateTime | |
| `trialEndsAt` / `cancelledAt` | DateTime? | |

---

## 4. API Routes

### 4.1 System-Level (`/system/api`)

#### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/system/api/auth/register` | Register new user |
| POST | `/system/api/auth/login` | Login with email/password |
| POST | `/system/api/auth/logout` | Logout session |
| POST | `/system/api/auth/refresh` | Refresh access token |
| POST | `/system/api/auth/csrf` | Get CSRF token |
| POST | `/system/api/auth/forgot-password` | Initiate password reset |
| POST | `/system/api/auth/reset-password` | Complete password reset |
| POST | `/system/api/auth/login/send` | Send login OTP |
| POST | `/system/api/auth/login/verify` | Verify login OTP |
| POST | `/system/api/auth/otp/send` | Send OTP |
| POST | `/system/api/auth/otp/verify` | Verify OTP |
| POST | `/system/api/auth/totp/setup` | Setup TOTP authenticator |
| POST | `/system/api/auth/totp/enable` | Enable TOTP |
| POST | `/system/api/auth/totp/disable` | Disable TOTP |
| POST | `/system/api/auth/sso/[provider]` | Initiate SSO OAuth flow |
| POST | `/system/api/auth/callback/[provider]` | SSO OAuth callback |
| GET | `/system/api/auth/session` | Get current session info |
| POST | `/system/api/auth/session/tokens` | Get tokens |
| POST | `/system/api/auth/session/token-set` | Set tokens in cookies |
| GET | `/system/api/auth/me/profile` | Get own profile |
| GET | `/system/api/auth/me/preferences` | Get own preferences |
| GET | `/system/api/auth/me/security` | Get own security settings |
| GET | `/system/api/auth/me/tenants` | Get own tenants + pending invitations |

#### User Management (Admin)
| Method | Path | Description |
|---|---|---|
| GET | `/system/api/users` | List users (paginated) |
| POST | `/system/api/users` | Create user |
| GET | `/system/api/users/[userId]` | Get user by ID |
| PUT | `/system/api/users/[userId]` | Update user |

#### Tenant Management
| Method | Path | Description |
|---|---|---|
| GET | `/system/api/tenants` | List tenants (admin) |
| POST | `/system/api/tenants/create` | Create tenant |
| GET | `/system/api/tenants/[tenantId]` | Get tenant |
| PUT | `/system/api/tenants/[tenantId]` | Update tenant |
| GET | `/system/api/tenant/[tenantId]/members` | List tenant members |

#### Subscription Plans
| Method | Path | Description |
|---|---|---|
| GET | `/system/api/subscriptions/plans` | List all plans |
| GET | `/system/api/subscriptions/plans/public` | Get public plans |
| POST | `/system/api/subscriptions/plans` | Create plan (admin) |
| GET | `/system/api/subscriptions/plans/[planId]` | Get plan |
| PUT | `/system/api/subscriptions/plans/[planId]` | Update plan |
| DELETE | `/system/api/subscriptions/plans/[planId]` | Delete plan |
| GET | `/system/api/subscriptions/plans/[planId]/features` | Get plan features |
| POST | `/system/api/subscriptions/plans/[planId]/features` | Add feature |
| PUT | `/system/api/subscriptions/plans/[planId]/features/[featureId]` | Update feature |
| DELETE | `/system/api/subscriptions/plans/[planId]/features/[featureId]` | Delete feature |

#### Settings
| Method | Path | Description |
|---|---|---|
| GET | `/system/api/settings` | Get all settings (admin) |
| POST/PUT | `/system/api/settings` | Update settings |
| GET | `/system/api/settings/public` | Get public settings |

#### Storage
| Method | Path | Description |
|---|---|---|
| POST | `/system/api/storage` | Upload file (multipart) |
| POST | `/system/api/storage/from-url` | Upload file from URL |

---

### 4.2 Tenant-Level (`/tenant/[tenantId]/api`)

| Method | Path | Description |
|---|---|---|
| POST | `/tenant/[tenantId]/api/auth` | Tenant auth |
| POST | `/tenant/[tenantId]/api/auth/login` | Tenant login |
| POST | `/tenant/[tenantId]/api/auth/csrf` | Tenant CSRF token |
| POST | `/tenant/[tenantId]/api/auth/refresh` | Tenant token refresh |
| GET | `/tenant/[tenantId]/api/members` | List members (USER+) |
| POST | `/tenant/[tenantId]/api/members` | Add member (ADMIN+) |
| GET | `/tenant/[tenantId]/api/members/[memberId]` | Get member |
| PUT | `/tenant/[tenantId]/api/members/[memberId]` | Update member |
| DELETE | `/tenant/[tenantId]/api/members/[memberId]` | Remove member |
| GET | `/tenant/[tenantId]/api/invitations` | List invitations (ADMIN+) |
| POST | `/tenant/[tenantId]/api/invitations` | Send invitation (ADMIN+) |
| GET | `/tenant/[tenantId]/api/invitations/[invitationId]` | Get invitation (ADMIN+) |
| DELETE | `/tenant/[tenantId]/api/invitations/[invitationId]` | Revoke invitation (ADMIN+) |
| GET | `/tenant/[tenantId]/api/invitations/accept?token=` | Preview invitation info (public) |
| POST | `/tenant/[tenantId]/api/invitations/accept` | Accept invitation (system session, token in body) |
| POST | `/tenant/[tenantId]/api/invitations/decline` | Decline invitation (system session, token in body) |

---

## 5. Service Layer

### 5.1 Auth Services (`modules/auth/`)

#### `AuthService` (`auth.service.ts`)
| Method | Description |
|---|---|
| `login({email, password})` | Authenticate user, verify bcrypt |
| `register({email, password, phone})` | Register user (first user → ADMIN), auto-provisions personal tenant, auto-accepts pending invitations |
| `logout({accessToken})` | Invalidate session |
| `hashPassword(password)` | bcrypt hash (salt: 10) |
| `generateToken()` | Generate 6-digit random token |
| `checkIfUserHasRole(user, role)` | Role hierarchy check |

#### `PasswordService` (`auth.password.service.ts`)
| Method | Description |
|---|---|
| `forgotPassword({email})` | Store reset token in Redis (TTL: 1h) |
| `resetPassword({email, resetToken, newPassword})` | Validate token + update password |
| `validateResetToken({email, resetToken})` | Verify SHA-256 hashed token |
| `invalidateResetToken({email})` | Delete from Redis |
| `changePassword({userId, currentPassword, newPassword})` | Authenticated password change |

Rate limit: 5 attempts / 60s

#### `OTPService` (`auth.otp.service.ts`)
| Method | Description |
|---|---|
| `requestOTP({user, userSession, method, action})` | Generate + send OTP via EMAIL or SMS |
| `verifyOTP({userSession, otpToken, method, action})` | Verify OTP from Redis |
| `consumeBackupCode({user, code})` | Use a backup code |

- OTP expiry: 10 minutes
- Rate limit: 5 requests / 60s

#### `TOTPService` (`auth.totp.service.ts`)
| Method | Description |
|---|---|
| `generateSecret()` | Generate TOTP secret |
| `getOtpauthURL({user, secret})` | Get `otpauth://` URL for QR code |
| `requestSetup({user, userSession})` | Start TOTP setup (10 min window) |
| `verifyAndEnable({user, userSession, otpToken})` | Enable TOTP with code verification |
| `verifyAuthenticate({user, otpToken})` | Verify login TOTP code |
| `consumeBackupCode({user, code})` | Use backup code (bcrypt hashed) |

Generates 4 backup codes (format: `XXXX-XXXX`)

#### `SSOService` (`modules/auth_sso/auth_sso.service.ts`)
| Method | Description |
|---|---|
| `generateAuthUrl(provider, state)` | Generate OAuth redirect URL |
| `handleCallback(provider, code)` | Exchange code for tokens + profile |
| `authenticateOrRegister(provider, code)` | Auto-register or link account |
| `linkAccount(userId, provider, code)` | Link SSO to existing user |
| `unlinkAccount(userId, provider)` | Unlink provider |
| `getLinkedAccounts(userId)` | Get all linked providers |

Supported: Google, GitHub, LinkedIn, Microsoft, Facebook, Apple + others

---

### 5.2 Session Services (`modules/user_session/`)

#### `UserSessionService` (`user_session.service.ts`)
| Method | Description |
|---|---|
| `generateAccessToken(payload)` | JWT (default: 1h) |
| `generateRefreshToken(payload)` | JWT (default: 7d) |
| `verifyAccessToken(token, fingerprint)` | Verify + decode + check fingerprint |
| `verifyRefreshToken(token)` | Verify + decode |
| `createSession({user, userSecurity, deviceFingerprint, ...})` | Create session record |
| `refreshTokens({refreshToken, deviceFingerprint})` | Rotate tokens |
| `revokeSession(userSessionId)` | Mark as REVOKED |
| `generateDeviceFingerprint({ip, userAgent, acceptLanguage})` | SHA-256 fingerprint |

#### `UserSessionNextService` (`user_session.service.next.ts`)
| Method | Description |
|---|---|
| `generateDeviceFingerprint(request)` | From Next.js request headers |
| `createSession({user, request, userSecurity, otpIgnore})` | Create session from Next.js request |
| `getSessionWithUser({accessToken, request})` | Fetch session (Redis cache 30 min → DB fallback) |
| `authenticateUserByRequest({request, requiredUserRole})` | Full auth middleware |
| `refreshSessionTokens({refreshToken, request})` | Refresh from Next.js request |

---

### 5.3 User Services

#### `UserService` (`modules/user/user.service.ts`)
| Method | Description |
|---|---|
| `create({email, password, phone, userRole})` | Create user |
| `getAll({page, pageSize, search, userId})` | Paginated user list |
| `getById(userId)` | Get by ID |
| `getByEmail(email)` | Get by email |
| `update({userId, data})` | Update user fields |
| `delete(userId)` | Soft delete (set `deletedAt`) |
| `recoverUser(userId)` | Restore soft-deleted user |

#### `UserProfileService` (`modules/user_profile/user_profile.service.ts`)
| Method | Description |
|---|---|
| `getByUserId(userId)` | Get profile |
| `create(userId, data)` / `update(userId, data)` / `upsert(userId, data)` | CRUD |
| `addSocialLink(userId, link)` | Append social link |
| `removeSocialLink(userId, platform)` | Remove by platform |

#### `UserPreferencesService` (`modules/user_preferences/user_preferences.service.ts`)
| Method | Description |
|---|---|
| `getByUserId(userId)` | Get preferences |
| `create` / `update` / `upsert` | CRUD |
| `getOrCreateDefault(userId)` | Get or create with defaults |

#### `UserSecurityService` (`modules/user_security/user_security.service.ts`)
| Method | Description |
|---|---|
| `getByUserId(userId)` | Get security record |
| `getSafeByUserId(userId)` | Get without secrets |
| `createDefaultUserSecurity(userId)` | Create defaults |
| `updateUserSecurity` / `upsertUserSecurity` | CRUD |
| `recordLoginAttempt(userId, success, ip, device)` | Track attempts |

Account lockout: 5 failed attempts → 15 min lock

---

### 5.4 Tenant Services

#### `TenantInvitationService` (`modules/tenant_invitation/tenant_invitation.service.ts`)
| Method | Description |
|---|---|
| `getByTenantId({tenantId, page, pageSize, status})` | List invitations |
| `getById(invitationId)` | Get invitation by ID |
| `getByToken(rawToken)` | Lookup by raw token (hashes internally) |
| `send(tenantId, invitedByUserId, {email, memberRole})` | Send invite — auto-revokes prior PENDING for same email |
| `preview(tenantId, rawToken)` | Public token preview (validates usability) |
| `accept(tenantId, userId, userEmail, rawToken)` | Accept — adds member + marks ACCEPTED |
| `decline(tenantId, userEmail, rawToken)` | Decline — marks DECLINED |
| `revoke(invitationId, tenantId)` | Admin revoke — marks REVOKED |
| `autoAcceptForEmail(userId, email)` | Bulk-accept all PENDING for an email (called on register) |

---

#### `TenantService` (`modules/tenant/tenant.service.ts`)
| Method | Description |
|---|---|
| `getAll({page, pageSize, search})` | Paginated tenant list |
| `getById(tenantId)` | Get tenant |
| `create(data)` | Create tenant |
| `update(tenantId, data)` | Update tenant |
| `delete(tenantId)` | Soft delete (set `deletedAt`) |
| `provisionPersonal(userId, email)` | Create personal tenant + add user as OWNER (called on register) |
| `provisionPersonal(userId, email)` | Create personal tenant + add user as OWNER (called on register) |

#### `TenantMemberService` (`modules/tenant_member/tenant_member.service.ts`)
| Method | Description |
|---|---|
| `getByTenantId({tenantId, page, pageSize, ...})` | List members |
| `getById(tenantMemberId)` | Get member |
| `getByTenantAndUser({tenantId, userId})` | Get specific member |
| `create({tenantId, userId, memberRole, memberStatus})` | Add member |
| `update(tenantMemberId, data)` | Update role/status |
| `delete(tenantMemberId)` | Soft delete |
| `canUserManageMember(userRole, targetRole)` | Permission check |

Role hierarchy: `OWNER > ADMIN > USER`

#### `TenantDomainService` (`modules/tenant_domain/tenant_domain.service.ts`)
| Method | Description |
|---|---|
| `getByTenantId({tenantId, ...})` | List domains |
| `getById(tenantDomainId)` | Get domain (Redis cached 5 min) |
| `getByDomain(domain)` | Lookup by domain string (Redis cached 5 min) |
| `create({tenantId, domain, isPrimary})` | Add domain |
| `initiateVerification({tenantDomainId})` | Start DNS TXT verification |
| `verifyDomain(verificationToken)` | Complete verification |
| `delete(tenantDomainId)` | Delete domain |

#### `TenantSubscriptionService` (`modules/tenant_subscription/tenant_subscription.service.ts`)
| Method | Description |
|---|---|
| `createPlan(data)` | Create plan |
| `getPlans(status)` / `getPlansWithFeatures(status)` | Fetch plans |
| `updatePlan` / `deletePlan` | Plan management |
| `createFeature({planId, key, label, type, value})` | Add feature |
| `assignSubscription({tenantId, planId, billingInterval})` | Assign plan to tenant |
| `updateSubscription` / `cancelSubscription` | Subscription lifecycle |

---

### 5.5 Notification Services

#### `MailService` (`modules/notification_mail/notification_mail.service.ts`)
**Queue:** BullMQ (Redis backend, concurrency: 5)

Supported providers: SMTP, SendGrid, Mailgun, AWS SES, Postmark, Resend

| Method | Description |
|---|---|
| `sendMail({to, subject, html, provider})` | Queue email job |
| `sendNewLoginEmail({email})` | Login notification |
| `sendForgotPasswordEmail({email, resetToken})` | Password reset email |
| `sendVerificationEmail({email, verificationLink})` | Email verification |
| `sendTenantInvitationEmail({email, tenantName, memberRole, rawToken, tenantId})` | Tenant invitation email |

---

### 5.6 Storage Service (`modules/storage/storage.service.ts`)

Supported providers: AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO

| Method | Description |
|---|---|
| `uploadFile({file, folder, filename, provider, tenantId})` | Upload file |
| `uploadFromUrl({url, folder, filename, provider, tenantId})` | Upload from remote URL |
| `deleteFile({key, provider, tenantId})` | Delete file |
| `getFileUrl({key, expiresIn, provider})` | Get signed URL |

Configuration sourced dynamically from `SettingService`.

---

### 5.7 Payment Service (`modules/payment/payment.service.ts`)

Supported providers: Stripe, PayPal, Iyzico

| Method | Description |
|---|---|
| `create(data)` | Create payment record |
| `getById(paymentId)` | Get payment |
| `getAll({userId, tenantId, status})` | List payments |
| `update(paymentId, data)` | Update payment |
| `refund({paymentId, amount})` | Process refund |
| `createTransaction(data)` | Create transaction record |
| `getTransactions({paymentId})` | List transactions |

---

### 5.8 Setting Service (`modules/setting/setting.service.ts`)

| Method | Description |
|---|---|
| `getAll(tenantId)` | Get all settings |
| `getByKey(key, tenantId)` | Single setting (Redis cached 10 min) |
| `getByKeys(keys, tenantId)` | Multi-key fetch |
| `set(key, value, tenantId)` | Write setting |
| `updateMany(settings)` | Batch update |
| `delete(key, tenantId)` | Delete setting |

System tenant ID: `00000000-0000-0000-0000-000000000000`

---

## 6. TypeScript Types & Interfaces

### User Types (`modules/user/user.types.ts`)
```typescript
type User = {
  userId: string;
  email: string;
  phone: string | null;
  password: string;          // bcrypt hashed
  userRole: UserRole;
  userStatus: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type SafeUser = Omit<User, 'password' | 'deletedAt'>
```

### Session Types (`modules/user_session/user_session.types.ts`)
```typescript
interface SafeUserSession {
  userSessionId: string;
  userId: string;
  accessToken: string;       // SHA-256 hashed
  refreshToken: string;      // SHA-256 hashed
  deviceFingerprint: string;
  userAgent: string;
  ipAddress: string;
  sessionStatus: SessionStatus;
  otpVerifyNeeded: boolean;
  sessionExpiry: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Tenant Types (`modules/tenant/tenant.types.ts`)
```typescript
type Tenant = {
  tenantId: string;
  name: string;
  description: string | null;
  tenantStatus: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  domains?: TenantDomain[];
}

type SafeTenant = Omit<Tenant, 'deletedAt'>
```

### Module System Types (`modules/module.types.ts`)
```typescript
type ModuleScope = 'system' | 'tenant' | 'both';

interface SettingsTab {
  id: string;
  label: string;
  icon: IconDefinition;
  component: React.ComponentType;
  order: number;
  scope: ModuleScope;
  keys: string[];
  permissions: string[];
}

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: IconDefinition;
  scope: ModuleScope;
  children?: MenuItem[];
  badge?: { type: 'count' | 'dot' | 'text'; source: string };
}
```

### DTOs (Zod schemas in each `*.dto.ts`)
| DTO | Fields |
|---|---|
| `LoginDTO` | `email`, `password` |
| `RegisterDTO` | `email`, `password`, `phone?` |
| `CreateTenantInput` | `name`, `description?` |
| `CreatePlanDTO` | `name`, `monthlyPrice`, `yearlyPrice`, `currency`, `trialDays`, etc. |
| `UploadFileDTO` | `file`, `folder?`, `filename?`, `provider?`, `tenantId?` |
| `CreatePaymentDTO` | `userId?`, `tenantId?`, `amount`, `currency`, `provider`, etc. |

---

## 7. Middleware & Request Handling

### 7.1 Multi-Tenancy Proxy (`proxy.ts`)

Determines tenant context before routing every request:

```
Request
  └─ Is system domain (localhost / system.*)? → /system/...
  └─ Has /t/{tenantId}/ path prefix?          → /tenant/{tenantId}/...  (path-based)
  └─ Has subdomain?                           → lookup TenantDomain in Redis/DB
                                                → /tenant/{tenantId}/...  (subdomain-based)
```

- Excludes: `/_next`, `/assets`, static file extensions
- Auto-detects Vercel URL for path-based tenancy

### 7.2 Authentication Middleware

Usage pattern in API routes:
```typescript
const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({
  request,
  requiredUserRole: 'ADMIN',    // optional
  otpVerifyBypass: false,       // optional
});
```

Flow:
1. Extract `accessToken` from cookies / `Authorization` header
2. Verify JWT signature
3. Check Redis cache (30 min TTL)
4. Fall back to DB on cache miss
5. Validate device fingerprint
6. Check OTP requirement if `otpVerifyNeeded: true`

### 7.3 Rate Limiter (`libs/limiter/index.ts`)
- 10 requests / 60 seconds per IP
- Redis key: `rate_limit:{ip}`
- Currently soft-disabled (returns success)

---

## 8. Caching Strategy

| Data | Cache Key Pattern | TTL |
|---|---|---|
| User session | `session:{accessTokenHash}` | 30 min |
| Tenant domain lookup | `tenant_domain:{domain}` | 5 min |
| Global settings | `setting:{tenantId}:{key}` | 10 min |

Invalidation: manual `redis.del()` after writes.

---

## 9. Queue System

Provider: **BullMQ** backed by Redis.

| Queue | Workers | Purpose |
|---|---|---|
| `mail_queue` | 5 concurrent | Async email sending |

---

## 10. Security Features

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt (salt rounds: 10) |
| Token storage | SHA-256 hashed before DB/Redis |
| OTP | 6-digit, 10 min expiry, rate-limited (5/60s) |
| TOTP backup codes | bcrypt hashed, format `XXXX-XXXX` |
| Account lockout | 5 failed logins → 15 min lock |
| Device fingerprinting | SHA-256(IP + User-Agent + Accept-Language) |
| CSRF protection | Token-based CSRF endpoints |
| Session expiry | 7 days default |
| Token rotation | Refresh token → new access + refresh tokens |
| Cookies | HttpOnly, SameSite, Secure flags |

---

## 11. Environment Variables

### Core
```env
NODE_ENV=development|production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
```

### Auth & Sessions
```env
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
SESSION_EXPIRY_MS=604800000
SESSION_CACHE_TTL=1800
```

### OTP / TOTP
```env
OTP_LENGTH=6
OTP_EXPIRY_SECONDS=600
OTP_RATE_LIMIT_SECONDS=60
OTP_MAX_ATTEMPTS=5
TOTP_ISSUER=Relatia
TOTP_STEP_SECONDS=30
TOTP_WINDOW=1
TOTP_SETUP_EXPIRY_SECONDS=600
```

### Invitations
```env
INVITATION_TTL_SECONDS=604800   # 7 days default
```

### Multi-Tenancy
```env
NEXT_PUBLIC_TENANT_DEFAULT_SUBDOMAIN=system
NEXT_PUBLIC_TENANT_WILDCARD_DOMAIN=example.com
NEXT_PUBLIC_PATH_TENANT_HOSTS=
VERCEL_URL=
```

### Mail
```env
MAIL_PROVIDER=smtp|sendgrid|mailgun|ses|postmark|resend
MAIL_FROM=noreply@example.com
APPLICATION_NAME=
APPLICATION_HOST=http://localhost:3000
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS=
SENDGRID_API_KEY=
MAILGUN_API_KEY=
```

### Storage
```env
STORAGE_PROVIDER=aws-s3|cloudflare-r2|digitalocean-spaces|minio
S3_BUCKET= S3_REGION= S3_ACCESS_KEY= S3_SECRET_KEY= S3_ENDPOINT=
```

### Payment
```env
PAYMENT_DEFAULT_PROVIDER=STRIPE|PAYPAL|IYZICO
STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID= PAYPAL_CLIENT_SECRET=
IYZICO_API_KEY=
```

### AI
```env
AI_PROVIDER=openai|anthropic|google
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
```

---

## 12. Key Architectural Patterns

| Pattern | Where Used |
|---|---|
| **Service Layer** | All business logic in `modules/**/[module].service.ts` |
| **DTO + Zod validation** | All API routes parse input via `*.dto.ts` Zod schemas |
| **Soft Delete** | `deletedAt` on User, Tenant, TenantMember |
| **Cache-Aside** | Redis cache → DB fallback on sessions, domains, settings |
| **Queue (BullMQ)** | Async email processing |
| **Multi-provider Strategy** | Mail, Storage, Payment, AI each support swappable providers |
| **Multi-Tenancy** | System scope (`/system`) + Tenant scope (`/tenant/[id]`) |
| **RBAC** | User roles (USER/ADMIN) + Tenant member roles (USER/ADMIN/OWNER) |
| **Device Fingerprinting** | SHA-256 of IP+UA+Language bound to JWT sessions |
| **Modular Prisma Schema** | Schema split per module in `prisma/schema/` |
| **Module Registry** | JSON-based module config drives UI menus and settings tabs |

---

## 13. Data Flow Examples

### Registration
```
POST /system/api/auth/register
  → RateLimit check
  → RegisterDTO.parse(body)
  → AuthService.register()
      → Creates User
      → TenantService.provisionPersonal()   (creates personal tenant, adds user as OWNER)
      → TenantInvitationService.autoAcceptForEmail()  (accepts all PENDING invites for email)
  → UserSessionNextService.createSession()
  → Response: { user, userSession } + cookies
```

### Login
```
POST /system/api/auth/login
  → RateLimit check
  → LoginDTO.parse(body)
  → AuthService.login()            (bcrypt.compare)
  → UserSecurity.recordLoginAttempt()
  → UserSessionNextService.createSession()
  → MailService.sendNewLoginEmail() (queued)
  → Response: { user, userSecurity } + HttpOnly cookies
```

### Tenant Member Access
```
GET /tenant/[tenantId]/api/members
  → TenantSessionNextService.authenticateUserByRequest()
      → JWT verify → Redis cache → DB fallback
      → Device fingerprint check
      → TenantMember role >= USER
  → TenantMemberService.getByTenantId()
  → Response: { members, pagination }
```

### File Upload
```
POST /system/api/storage  (multipart/form-data)
  → Auth middleware
  → UploadFileDTO.parse()
  → StorageService reads provider config from SettingService
  → Provider.upload(file)         (S3 / R2 / Spaces / MinIO)
  → Response: { url, key, bucket, size, provider }
```

---

## 14. Deployment

### Build Command
```bash
npx prisma generate && npx prisma db push && next build
```

### Supported Environments
| Environment | Notes |
|---|---|
| Local dev | `next dev -H 0.0.0.0 -p 3000` |
| Vercel | Zero-config, auto-detects `VERCEL_URL`, uses `db push` |
| Self-hosted | Standard Node.js + PostgreSQL + Redis |

### Logging
- **Library:** Winston
- **Transports:** File (production) / Console (Vercel / dev)
- **Format:** `[timestamp] [level]: message`
- **Storage:** `logs/` directory with daily rotation
