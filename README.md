# Next Boilerplate

Production-ready multi-tenant SaaS starter built with Next.js 16, TypeScript, PostgreSQL, and Redis.

> **🤖 AI agents:** read [AGENTS.md](AGENTS.md) first — canonical orientation guide. Then pull the machine-readable catalog from `public/registry/` (modules, routes, entities, components, conventions) or talk to the MCP server in [.mcp.json](.mcp.json). Editor-native rule mirrors: [.cursor/rules/next-boilerplate.mdc](.cursor/rules/next-boilerplate.mdc), [.cursorrules](.cursorrules), [.windsurfrules](.windsurfrules), [.github/copilot-instructions.md](.github/copilot-instructions.md), [.clinerules](.clinerules). Module index: [modules/MODULES.md](modules/MODULES.md). UI catalog: [modules_next/COMPONENTS.md](modules_next/COMPONENTS.md). Rebuild the catalog after any change: `npm run registry:snapshot`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, RSC) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL via TypeORM (single shared schema; root tenant owns platform-level rows) |
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

# 3. Sync schema, apply SQL/RLS migrations, and seed PLATFORM + ACME tenants
#    (the seed step runs only on a fresh database — no tenant rows yet)
npm run db:deploy

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL URL. All entities live in this single DB. Per-tenant DB isolation is opt-in via `tenant_databases` rows (`{ tenantId, databaseUrl }`). |
| `REDIS_URL` | ✅ | Redis connection string (e.g. `redis://localhost:6379`) |
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
  tenant/[tenantId]/          # Every page + API lives under a tenant
    admin/                    # Tenant admin dashboard — members, invitations, domains,
                              #   subscription, api-keys, api-docs, webhooks, settings,
                              #   me, plus features that only render for the root tenant
                              #   today but use plain paths: ai, coupons, fleet, health,
                              #   payments, plans, saml, tenants, users
    api/                      # Tenant API handlers (flat — no /admin/ segment)
    api-docs/                 # Swagger UI (root = SYSTEM_SPEC, others = TENANT_SPEC)
    auth/                     # Auth pages (login, register, forgot-password, callback,
                              #   create-tenant, select-tenant, logout)

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

The **root tenant** (`ROOT_TENANT_ID = 00000000-0000-4000-8000-000000000000`, name `"Platform"`) is a real tenant row that hosts the platform-admin / super-admin surface. There is no separate "system" scope — every request resolves to a tenant. A super-admin is a `TenantMember` of the root tenant with `memberRole = 'ADMIN'`.

Two tenancy modes are supported:

**Domain mode** (default): Each tenant maps to a subdomain or custom domain.
- Root tenant: `localhost` (dev) or `{TENANT_DEFAULT_SUBDOMAIN}.{TENANT_WILDCARD_DOMAIN}` (e.g. `system.example.com`) — both resolve to `ROOT_TENANT_ID`
- Customer tenants: `tenant1.example.com` or custom domain (looked up in `TenantDomain`)

**Path mode**: Tenant is identified by URL path prefix.
- Root tenant: `example.com/...` (anything outside the tenant prefix)
- Customer tenants: `example.com/t/{tenantId}/...`

The proxy logic runs in Next.js middleware (`proxy.ts`) and rewrites every URL to the correct `/tenant/{tenantId}/...` internal route.

### Tenant-owned providers

Every tenant configures its own integration credentials through the **Integrations** tab in `/admin/settings`:

| Domain | Providers (configured per tenant) |
|---|---|
| Payments | Stripe · PayPal · Iyzico · Alipay · CloudPayments · WeChat Pay · YooKassa |
| AI | Anthropic · OpenAI · Google |
| Email | SMTP · AWS SES · Mailgun · Postmark · Resend · SendGrid |
| SMS | Twilio · Nexmo · Clickatell · NetGSM |
| Storage | AWS S3 · Cloudflare R2 · DigitalOcean Spaces · MinIO |
| Auth (SSO) | Google · GitHub · Apple · Microsoft · Meta · LinkedIn · Twitter · Slack · TikTok · WeChat · Autodesk |
| Captcha | hCaptcha · reCAPTCHA |

Each service (`PaymentService`, `AIService`, `MailService`, `SmsService`, `StorageService`, `CaptchaService`) and concrete provider takes `tenantId` as its first argument and reads credentials from that tenant's row in `settings`. When a customer pays tenant X, the charge runs against X's Stripe account; when X sends a welcome email, it goes through X's SMTP. `SubscriptionPlan`, `PlanFeature`, `Coupon` are also tenant-scoped so each tenant exposes its own pricing to its own customers.

Auto-seed: `TenantService.create()` provisions every new tenant with a Free plan + subscription + locale defaults so the workspace is usable on day one.

## API

All public API calls go through the proxy layer:

```
GET  /api/tenant/{ROOT_TENANT_ID}/admin/health   → platform health (root-only)
POST /api/tenant/{tenantId}/auth/login                    → tenant login
/api/tenant/{tenantId}/{route}                            → tenant-scoped routes
```

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Tests use Vitest + @testing-library/react. Mock the `axiosInstance` boundary for client component tests; mock `getDataSource` for service-layer tests. Test files follow the naming convention:
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
