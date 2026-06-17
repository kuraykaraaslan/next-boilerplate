import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faGaugeHigh, faRightToBracket, faBook, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import TenantService from '@kuraykaraaslan/tenant/server/tenant.service'

// Root fallback ("muhteşem"): the tenant home (`/`) must NEVER 404. When no
// published CMS page exists at the root slug, we render this welcome hero
// instead of calling notFound(). It is a pure Server Component — no client JS,
// animations are CSS-only so it streams instantly.

interface Props {
  tenantId: string
}

const links = [
  { href: '/admin', icon: faGaugeHigh, title: 'Dashboard', desc: 'Manage your workspace, content and settings.' },
  { href: '/auth/login', icon: faRightToBracket, title: 'Sign in', desc: 'Access your account and pick up where you left off.' },
  { href: '/admin/api-docs', icon: faBook, title: 'API & Docs', desc: 'Explore the API reference and developer guides.' },
]

export default async function TenantWelcome({ tenantId }: Props) {
  const tenant = await TenantService.getById(tenantId).catch(() => null)
  const name = tenant?.name?.trim() || 'Welcome'
  const tagline = tenant?.description?.trim() || 'Your space is ready. Start building something remarkable.'

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-surface-base">
      {/* ambient gradient orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-primary-subtle/40 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised/70 px-4 py-1.5 text-xs font-medium text-text-secondary backdrop-blur">
          <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary" aria-hidden="true" />
          Powered by your platform
        </span>

        <h1 className="mt-8 bg-gradient-to-br from-text-primary via-text-primary to-primary bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
          {name}
        </h1>

        <p className="mt-6 max-w-xl text-lg text-text-secondary">
          {tagline}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin"
            className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-fg shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
          >
            Go to Dashboard
            <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-6 py-3 text-base font-medium text-text-primary transition-colors hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
          >
            Sign in
          </Link>
        </div>

        {/* quick-link cards */}
        <div className="mt-20 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-surface-raised/80 p-6 text-left backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                <FontAwesomeIcon icon={l.icon} aria-hidden="true" />
              </span>
              <span className="flex items-center gap-2 font-semibold text-text-primary">
                {l.title}
                <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" className="text-xs text-text-tertiary transition-all group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none" />
              </span>
              <span className="text-sm text-text-secondary">{l.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
