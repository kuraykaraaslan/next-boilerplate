# Next Boilerplate

Production-ready multi-tenant SaaS starter built with Next.js 16, TypeScript, PostgreSQL, and Redis.

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
| Payments | Stripe |

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
app/                     # Next.js App Router
  system/                # System-scoped pages + API routes
    admin/               # Admin dashboard
    api/                 # System API handlers
    auth/                # Auth pages (login, register, etc.)
  tenant/[tenantId]/     # Tenant-scoped pages + API routes
    admin/               # Tenant admin dashboard
    api/                 # Tenant API handlers
    auth/                # Tenant auth pages

modules/                 # Feature modules (service + DTO + UI)
  ai/                    # AI provider integrations
  auth/                  # Authentication (login, register, OTP, TOTP)
  auth_saml/             # SAML SSO
  auth_sso/              # OAuth (Google, GitHub, etc.)
  notification_mail/     # Email notifications
  notification_push/     # Web push notifications
  notification_sms/      # SMS notifications
  payment/               # Stripe billing
  setting/               # System settings
  storage/               # File uploads (S3)
  tenant/                # Tenant management
  tenant_member/         # Tenant membership
  tenant_subscription/   # Subscription plans
  ui/                    # Shared UI components
  user/                  # User management
  user_session/          # Session management
  webhook/               # Outgoing webhooks

libs/                    # Cross-cutting utilities
  axios/                 # axiosInstance with withCredentials
  logger/                # Winston logger
  redis/                 # Redis client + BullMQ
  typeorm/               # DataSource setup (system + tenant)
  utils/                 # cn(), AppError, etc.
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
