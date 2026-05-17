# Next Boilerplate

Production-ready multi-tenant SaaS starter built with Next.js 16, TypeScript, PostgreSQL, and Redis.

> **🤖 AI agents:** read [AGENTS.md](AGENTS.md) first. It's the canonical map of the codebase — architecture rules, where every module lives, file-naming conventions, and how to add new things. Module index: [modules/MODULES.md](modules/MODULES.md). UI catalog: [modules_next/COMPONENTS.md](modules_next/COMPONENTS.md).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, RSC) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL via TypeORM (dual-schema: system + tenant) |
| Cache / Queue | Redis + BullMQ |
| Auth | JWT (httpOnly cookies), OTP, TOTP, SAML, OAuth |
| UI | Tailwind CSS 4, Radix UI, FontAwesome, CVA |
| State | Zustand 5 |
| Forms | react-hook-form + Zod |
| Testing | Vitest + @testing-library/react |
| File Storage | AWS S3 |
| Email | Nodemailer |
| Payments | Stripe, PayPal, Iyzico |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd next-boilerplate
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database, Redis, and secret values

# 3. Run database migrations
npm run typeorm:migrate

# 4. Seed default admin + tenant
npx tsx scripts/default-admin.ts
npx tsx scripts/default-tenant.ts

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SYSTEM_DATABASE_URL` | ✅ | PostgreSQL URL for system schema |
| `TENANT_DATABASE_URL` | ✅ | PostgreSQL URL for tenant schema |
| `REDIS_HOST` | ✅ | Redis host |
| `REDIS_PORT` | ✅ | Redis port |
| `ACCESS_TOKEN_SECRET` | ✅ | JWT access token signing secret |
| `REFRESH_TOKEN_SECRET` | ✅ | JWT refresh token signing secret |
| `CSRF_SECRET` | ✅ | CSRF protection secret |
| `TENANCY_MODE` | — | `domain` (default) or `path` |
| `TENANT_WILDCARD_DOMAIN` | — | Base domain for subdomain tenancy |
| `AWS_S3_BUCKET` | — | S3 bucket for file uploads |
| `STRIPE_SECRET_KEY` | — | Stripe secret key for payments |

See `.env.example` for the full list.

## Project Structure

```
app/                          # Next.js App Router
  system/                     # System-scoped pages + API routes
    admin/                    # Admin dashboard (ai, api-docs, audit-logs, coupons,
                              #   health, me, payments, plans, saml, settings, tenants, users, webhooks)
    api/                      # System API handlers (auth, ai, audit-logs, coupons,
                              #   cron, health, notifications, saml, settings, storage,
                              #   subscriptions, tenant, tenants, users, webhooks)
    auth/                     # Auth pages (login, register, forgot-password, callback,
                              #   create-tenant, select-tenant, logout)
    fleet/                    # Fleet management panel
  tenant/[tenantId]/          # Tenant-scoped pages + API routes
    admin/                    # Tenant admin dashboard
    api/                      # Tenant API handlers
    api-docs/                 # Tenant-scoped API documentation
    auth/                     # Tenant auth pages

modules/                      # Framework-agnostic business logic
                              # No next/*, react, or browser API imports
  ai/                         # AI provider integrations (Anthropic, OpenAI, Google)
  api_doc/                    # OpenAPI/Swagger spec helpers
  api_key/                    # API key management
  audit_log/                  # Audit log (system + tenant entities)
  auth/                       # Authentication (login, register, OTP, TOTP, password)
  auth_impersonation/         # Admin impersonation of users
  auth_saml/                  # SAML SSO
  auth_sso/                   # OAuth (Google, GitHub, Apple, Microsoft, Facebook,
                              #   LinkedIn, Twitter, Slack, TikTok, WeChat, Autodesk)
  common/                     # Shared utilities (AppError)
  coupon/                     # Coupon & redemption (Stripe, PayPal, Iyzico providers)
  db/                         # TypeORM DataSource setup (system + tenant)
  env/                        # Typed env var access
  limiter/                    # Rate limiting + tenant-plan limits
  logger/                     # Winston logger
  notification_inapp/         # In-app notifications
  notification_mail/          # Email (SMTP, SES, Mailgun, Postmark, Resend, SendGrid)
  notification_push/          # Web push notifications
  notification_sms/           # SMS (Twilio, Nexmo, Clickatell, NetGSM)
  payment/                    # Payment processing (Stripe, PayPal, Iyzico)
  redis/                      # Redis client + BullMQ
  redis_idempotency/          # Idempotency keys via Redis
  setting/                    # System settings (key-value store)
  storage/                    # File uploads (S3, R2, DigitalOcean Spaces, MinIO)
  tenant/                     # Tenant management
  tenant_branding/            # Tenant branding/white-label settings
  tenant_domain/              # Custom domain management + DNS verification
  tenant_export/              # Tenant data export
  tenant_invitation/          # Tenant invitation flow
  tenant_member/              # Tenant membership & roles
  tenant_session/             # Tenant-scoped session handling
  tenant_setting/             # Per-tenant settings
  tenant_subscription/        # Subscription plans + feature keys
  tenant_usage/               # Usage tracking
  user/                       # User management
  user_agent/                 # User-agent parsing
  user_preferences/           # User preferences
  user_profile/               # User profile
  user_security/              # Security settings + passkeys
  user_session/               # Session management (CRUD, cache, tokens)
  user_social_account/        # Linked social accounts
  webhook/                    # Outgoing webhooks (system + tenant)

modules_next/                 # Next.js-specific layer — extends modules/ with framework coupling
                              # Dependency: app/ → modules_next/ → modules/
  common/axios/               # axiosInstance with withCredentials
  common/ui/                  # Shared React components (Button, Modal, Table, Toast, etc.)
  common/utils/               # cn() and other client utilities
  common/module.types.ts      # Runtime module types using React.ComponentType
  module.types.ts             # Top-level module type exports
  <module>/ui/                # Module-scoped React components
  <module>/hooks/             # Module-scoped React hooks
  <module>/*.service.next.ts  # NextRequest/NextResponse service extensions
```

## Multi-Tenancy

Two tenancy modes are supported:

**Domain mode** (default): Each tenant maps to a subdomain or custom domain.
- System panel: `system.example.com` or `localhost`
- Tenant panel: `tenant1.example.com` or custom domain

**Path mode**: Tenant is identified by URL path prefix.
- System panel: `example.com/...`
- Tenant panel: `example.com/t/{tenantId}/...`

The proxy logic runs in Next.js middleware (`proxy.ts`) and rewrites URLs to the correct internal app route.

## API

All public API calls go through the proxy layer:

```
GET /api/v1/system/health                        → health check (no auth)
POST /api/v1/system/auth/login                   → login
/api/v1/tenant/{tenantId}/{route}                → tenant-scoped routes
```

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Tests use Vitest + @testing-library/react. Mock the `axiosInstance` boundary for client component tests; mock `getSystemDataSource` for service-layer tests. Test files follow the naming convention:
- `[module].dto.test.ts` — DTO/Zod validation
- `[module].service.test.ts` — service unit tests (mocked DB)
- `[module].test.tsx` — React component tests

## Scripts

```bash
npm run dev           # Development server
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint
npm test              # Run tests
npm run test:coverage # Test coverage report
npm run analyze       # Bundle analyzer
```

## Deployment

1. Set all required env vars in your production environment
2. Run `npm run build`
3. Run migrations against production DB
4. Start with `npm run start`

For managed deployments (Vercel, Railway, Render), use `npm run vercel-build` as the build command.
