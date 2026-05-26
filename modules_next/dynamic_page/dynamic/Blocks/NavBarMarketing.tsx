'use client'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/modules_next/common/utils/cn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBars, faXmark, faBolt, faArrowRight, faChevronDown,
  faRocket, faCodeBranch, faChartLine, faPlug,
  faBook, faRss, faClockRotateLeft, faCircleCheck,
  faShield, faLifeRing, faUsers, faBriefcase,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { BlockDefinition } from '../types'

type NavLink = { label?: string; href?: string }
type MegaItem = { icon?: string; label?: string; description?: string; href?: string }
type MegaSection = {
  trigger?: string
  width?: string
  items?: MegaItem[]
  featuredEyebrow?: string
  featuredTitle?: string
  featuredDescription?: string
  featuredPrimaryLabel?: string
  featuredPrimaryHref?: string
  featuredSecondaryLabel?: string
  featuredSecondaryHref?: string
}

const ICON_MAP: Record<string, IconDefinition> = {
  rocket: faRocket,
  'code-branch': faCodeBranch,
  'chart-line': faChartLine,
  plug: faPlug,
  book: faBook,
  rss: faRss,
  'clock-rotate-left': faClockRotateLeft,
  'circle-check': faCircleCheck,
  shield: faShield,
  'life-ring': faLifeRing,
  users: faUsers,
  briefcase: faBriefcase,
  bolt: faBolt,
}

function NavBarMarketing(rawProps: Record<string, unknown>) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const [openMega, setOpenMega] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenMega(null), 150)
  }
  function cancelClose() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }
  function open(id: string) { cancelClose(); setOpenMega(id) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpenMega(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const logoText = (rawProps.logoText as string) || 'Brand'
  const inlineLinks = ((rawProps.inlineLinks as NavLink[]) || []).filter((l) => l?.label)
  const megaSections = ((rawProps.megaSections as MegaSection[]) || []).filter((s) => s?.trigger)
  const ctaLabel = (rawProps.ctaLabel as string) || ''
  const ctaHref = (rawProps.ctaHref as string) || '#'
  const signInLabel = (rawProps.signInLabel as string) || ''
  const signInHref = (rawProps.signInHref as string) || '#'
  const announceMessage = (rawProps.announceMessage as string) || ''
  const announceCtaLabel = (rawProps.announceCtaLabel as string) || ''
  const announceCtaHref = (rawProps.announceCtaHref as string) || '#'

  return (
    <>
      {announceMessage && (
        <div className="w-full bg-neutral-900 text-neutral-100 text-[11px]">
          <div className="mx-auto max-w-6xl px-6 py-1.5 flex items-center justify-center gap-2">
            <span className="opacity-90">{announceMessage}</span>
            {announceCtaLabel && (
              <>
                <span className="opacity-30">·</span>
                <a
                  href={announceCtaHref}
                  className="font-semibold underline-offset-2 hover:underline inline-flex items-center gap-1"
                >
                  {announceCtaLabel}
                  <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" aria-hidden="true" />
                </a>
              </>
            )}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface-base)]/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-2 h-14">
            <a href="/" className="flex items-center gap-2 flex-shrink-0 mr-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)]">
                <FontAwesomeIcon icon={faBolt} className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">{logoText}</span>
            </a>

            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
              {megaSections.map((section, idx) => {
                const id = `mega-${idx}`
                const isOpen = openMega === id
                const items = (section.items ?? []).filter((i) => i?.label)
                const hasFeatured = Boolean(section.featuredTitle)
                const width = section.width || (hasFeatured ? '600' : '400')
                return (
                  <div
                    key={id}
                    className="relative"
                    onMouseEnter={() => open(id)}
                    onMouseLeave={scheduleClose}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      onClick={() => setOpenMega(isOpen ? null : id)}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isOpen
                          ? 'bg-[var(--surface-overlay)] text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]',
                      )}
                    >
                      {section.trigger}
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={cn('w-2.5 h-2.5 transition-transform', isOpen && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <div
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                        style={{ width: `${width}px` }}
                        className="absolute left-0 top-full mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-xl overflow-hidden"
                      >
                        <div className={cn('grid', hasFeatured ? 'grid-cols-[1fr_188px]' : 'grid-cols-1')}>
                          <div className="p-3">
                            <div className={cn('grid gap-0.5', items.length > 4 ? 'grid-cols-2' : 'grid-cols-1')}>
                              {items.map((item, iidx) => {
                                const icon = item.icon ? ICON_MAP[item.icon] : undefined
                                return (
                                  <a
                                    key={`${item.label}-${iidx}`}
                                    href={item.href ?? '#'}
                                    onClick={() => setOpenMega(null)}
                                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-overlay)] transition-colors group"
                                  >
                                    {icon && (
                                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--primary-subtle)] text-[var(--primary)] shrink-0">
                                        <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" aria-hidden="true" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                        {item.label}
                                      </p>
                                      {item.description && (
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                          {hasFeatured && (
                            <div className="p-4 bg-[var(--surface-overlay)] border-l border-[var(--border)] flex flex-col justify-between gap-3">
                              <div>
                                {section.featuredEyebrow && (
                                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--primary)] mb-1.5">
                                    {section.featuredEyebrow}
                                  </p>
                                )}
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{section.featuredTitle}</p>
                                {section.featuredDescription && (
                                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                                    {section.featuredDescription}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {section.featuredPrimaryLabel && (
                                  <a
                                    href={section.featuredPrimaryHref || '#'}
                                    onClick={() => setOpenMega(null)}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90"
                                  >
                                    {section.featuredPrimaryLabel}
                                    <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" aria-hidden="true" />
                                  </a>
                                )}
                                {section.featuredSecondaryLabel && (
                                  <a
                                    href={section.featuredSecondaryHref || '#'}
                                    onClick={() => setOpenMega(null)}
                                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-center"
                                  >
                                    {section.featuredSecondaryLabel}
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {megaSections.length > 0 && inlineLinks.length > 0 && (
                <span className="w-px h-4 bg-[var(--border)] mx-1" aria-hidden="true" />
              )}

              {inlineLinks.map((link, idx) => (
                <a
                  key={`${link.label}-${idx}`}
                  href={link.href ?? '#'}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1.5">
              {signInLabel && (
                <a
                  href={signInHref}
                  className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
                >
                  {signInLabel}
                </a>
              )}
              {ctaLabel && (
                <a
                  href={ctaHref}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 transition-opacity"
                >
                  {ctaLabel}
                  <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
                className="lg:hidden ml-1 flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] transition-colors"
              >
                <FontAwesomeIcon icon={mobileOpen ? faXmark : faBars} className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <nav aria-label="Mobile navigation" className="lg:hidden border-t border-[var(--border)] bg-[var(--surface-base)]">
            <div className="px-4 py-3 space-y-0.5">
              {megaSections.map((section, idx) => {
                const id = `m-mega-${idx}`
                const items = (section.items ?? []).filter((i) => i?.label)
                const isExp = mobileExpanded === id
                return (
                  <div key={id}>
                    <button
                      type="button"
                      aria-expanded={isExp}
                      onClick={() => setMobileExpanded(isExp ? null : id)}
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
                    >
                      {section.trigger}
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={cn('w-3 h-3 text-[var(--text-secondary)] transition-transform', isExp && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </button>
                    {isExp && (
                      <div className="ml-3 mt-0.5 mb-1 border-l-2 border-[var(--border)] pl-3 space-y-0.5">
                        {items.map((item, iidx) => {
                          const icon = item.icon ? ICON_MAP[item.icon] : undefined
                          return (
                            <a
                              key={`${item.label}-${iidx}`}
                              href={item.href ?? '#'}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
                            >
                              {icon && <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" aria-hidden="true" />}
                              {item.label}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {inlineLinks.map((link, idx) => (
                <a
                  key={`m-${link.label}-${idx}`}
                  href={link.href ?? '#'}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
                >
                  {link.label}
                </a>
              ))}

              {(signInLabel || ctaLabel) && (
                <div className="pt-2 mt-1 border-t border-[var(--border)] space-y-1.5">
                  {signInLabel && (
                    <a
                      href={signInHref}
                      className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] transition-colors"
                    >
                      {signInLabel}
                    </a>
                  )}
                  {ctaLabel && (
                    <a
                      href={ctaHref}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--primary-fg)]"
                    >
                      {ctaLabel}
                      <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  )
}

const ICON_OPTIONS = Object.keys(ICON_MAP).map((k) => ({ label: k, value: k }))

export const NavBarMarketingDefinition: BlockDefinition = {
  type: 'NavBarMarketing',
  label: 'Nav: Marketing (Mega Menu)',
  description: 'Sticky marketing header with mega menus, thin announcement bar, inline links, sign-in and primary CTA',
  category: 'Navigation',
  defaultProps: {
    logoText: 'Velox',
    announceMessage: 'Velox 2.0 is here — faster builds, smarter branch previews.',
    announceCtaLabel: 'Read the announcement',
    announceCtaHref: '/changelog',
    inlineLinks: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Company', href: '/about' },
    ],
    signInLabel: 'Sign in',
    signInHref: '/login',
    ctaLabel: 'Start free',
    ctaHref: '/signup',
    megaSections: [
      {
        trigger: 'Product',
        width: '600',
        items: [
          { icon: 'rocket',      label: 'Deployments',     description: 'Zero-downtime rolling releases to any cloud',  href: '/features/deployments' },
          { icon: 'code-branch', label: 'Branch Previews', description: 'Auto-deploy every push, auto-expire on merge', href: '/features/previews' },
          { icon: 'chart-line',  label: 'Analytics',       description: 'Performance, errors & behaviour in one view',  href: '/features/analytics' },
          { icon: 'plug',        label: 'Integrations',    description: '100+ tools connected with a single click',     href: '/features/integrations' },
        ],
        featuredEyebrow: "What's new",
        featuredTitle: 'Velox 2.0',
        featuredDescription: 'Faster builds, smarter branch previews, and zero-config monorepo support.',
        featuredPrimaryLabel: 'Start free',
        featuredPrimaryHref: '/signup',
        featuredSecondaryLabel: 'Read announcement',
        featuredSecondaryHref: '/changelog',
      },
      {
        trigger: 'Resources',
        width: '480',
        items: [
          { icon: 'book',                label: 'Documentation', description: 'Guides, API refs, quickstarts',     href: '/docs' },
          { icon: 'rss',                 label: 'Blog',          description: 'Product news & engineering posts',  href: '/blog' },
          { icon: 'clock-rotate-left',   label: 'Changelog',     description: 'Every release, documented',         href: '/changelog' },
          { icon: 'circle-check',        label: 'System Status', description: 'Live uptime & incident reports',    href: '/status' },
        ],
        featuredEyebrow: '',
        featuredTitle: '',
        featuredDescription: '',
        featuredPrimaryLabel: '',
        featuredPrimaryHref: '',
        featuredSecondaryLabel: '',
        featuredSecondaryHref: '',
      },
      {
        trigger: 'Solutions',
        width: '600',
        items: [
          { icon: 'briefcase',   label: 'For Enterprise', description: 'SSO, audit logs, dedicated support',   href: '/enterprise' },
          { icon: 'users',       label: 'For Teams',      description: 'Shared workspaces & role-based access', href: '/teams' },
          { icon: 'shield',      label: 'Security',       description: 'SOC 2 Type II, GDPR, ISO 27001',        href: '/security' },
          { icon: 'life-ring',   label: 'Support',        description: '24/7 chat, email and phone',            href: '/support' },
        ],
        featuredEyebrow: 'Customer story',
        featuredTitle: 'How Acme cut deploy time by 70%',
        featuredDescription: 'Read how Acme used Velox to ship 4× more often with zero outages.',
        featuredPrimaryLabel: 'Read the case study',
        featuredPrimaryHref: '/customers/acme',
        featuredSecondaryLabel: 'View all stories',
        featuredSecondaryHref: '/customers',
      },
    ],
  },
  schema: {
    logoText:         { label: 'Logo Text',           type: 'text', placeholder: 'Brand' },
    announceMessage:  { label: 'Announce: Message',   type: 'text', placeholder: 'Optional thin banner message', group: 'Announcement bar' },
    announceCtaLabel: { label: 'Announce: CTA Label', type: 'text', placeholder: 'Read more',                      group: 'Announcement bar' },
    announceCtaHref:  { label: 'Announce: CTA URL',   type: 'url',  placeholder: '/news',                          group: 'Announcement bar' },
    megaSections: {
      label: 'Mega Menu Sections',
      type: 'repeater',
      group: 'Navigation',
      fields: {
        trigger: { label: 'Trigger Label', type: 'text', placeholder: 'Product' },
        width:   { label: 'Panel Width (px)', type: 'text', placeholder: '600' },
        items: {
          label: 'Items', type: 'repeater',
          fields: {
            icon:        { label: 'Icon', type: 'select', options: ICON_OPTIONS },
            label:       { label: 'Label', type: 'text', placeholder: 'Deployments' },
            description: { label: 'Description', type: 'text', placeholder: 'Short tagline' },
            href:        { label: 'URL', type: 'url', placeholder: '/features' },
          },
        },
        featuredEyebrow:        { label: 'Featured: Eyebrow',        type: 'text', placeholder: "What's new" },
        featuredTitle:          { label: 'Featured: Title',          type: 'text', placeholder: 'Leave empty to hide featured card' },
        featuredDescription:    { label: 'Featured: Description',    type: 'textarea' },
        featuredPrimaryLabel:   { label: 'Featured: Primary CTA',    type: 'text' },
        featuredPrimaryHref:    { label: 'Featured: Primary URL',    type: 'url' },
        featuredSecondaryLabel: { label: 'Featured: Secondary CTA',  type: 'text' },
        featuredSecondaryHref:  { label: 'Featured: Secondary URL',  type: 'url' },
      },
    },
    inlineLinks: {
      label: 'Inline Links (next to mega menus)',
      type: 'repeater',
      group: 'Navigation',
      fields: {
        label: { label: 'Label', type: 'text', placeholder: 'Pricing' },
        href:  { label: 'URL',   type: 'url',  placeholder: '/pricing' },
      },
    },
    signInLabel: { label: 'Sign-in Label', type: 'text', placeholder: 'Sign in', group: 'Right-side actions' },
    signInHref:  { label: 'Sign-in URL',   type: 'url',  placeholder: '/login',  group: 'Right-side actions' },
    ctaLabel:    { label: 'CTA Label',     type: 'text', placeholder: 'Start free', group: 'Right-side actions' },
    ctaHref:     { label: 'CTA URL',       type: 'url',  placeholder: '/signup',    group: 'Right-side actions' },
  },
  Component: NavBarMarketing as unknown as BlockDefinition['Component'],
}

export default NavBarMarketing
