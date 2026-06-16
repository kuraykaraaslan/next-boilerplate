'use client'
import { useState } from 'react'
import { cn } from '@nb/common/server/utils/cn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { BlockDefinition } from '../types'

type NavItem = { label?: string; href?: string }

function NavBarSimple(rawProps: Record<string, unknown>) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const logoText = (rawProps.logoText as string) || ''
  const navItems = ((rawProps.navItems as NavItem[]) || []).filter((i) => i?.label)
  const sticky = Boolean(rawProps.sticky)
  const bordered = rawProps.bordered !== false
  const ctaLabel = (rawProps.ctaLabel as string) || ''
  const ctaHref = (rawProps.ctaHref as string) || '#'

  return (
    <header
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-raised)]',
        bordered && 'border-b border-[var(--border)]',
        sticky && 'sticky top-0 z-40',
      )}
    >
      <button
        type="button"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] transition-colors"
      >
        <FontAwesomeIcon icon={mobileOpen ? faXmark : faBars} className="w-4 h-4" />
      </button>

      {logoText && (
        <a href="/" className="shrink-0 text-sm font-bold tracking-tight text-[var(--text-primary)]">
          {logoText}
        </a>
      )}

      <nav className="hidden md:flex items-center gap-0.5 flex-1" aria-label="Main navigation">
        {navItems.map((item, idx) => (
          <a
            key={`${item.label}-${idx}`}
            href={item.href ?? '#'}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {ctaLabel && (
        <a
          href={ctaHref}
          className="ml-auto hidden md:inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 transition-opacity"
        >
          {ctaLabel}
        </a>
      )}

      {mobileOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-[var(--surface-raised)] border-b border-[var(--border)] shadow-md z-30">
          <nav className="flex flex-col gap-0.5 p-3" aria-label="Mobile navigation">
            {navItems.map((item, idx) => (
              <a
                key={`m-${item.label}-${idx}`}
                href={item.href ?? '#'}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
              >
                {item.label}
              </a>
            ))}
            {ctaLabel && (
              <a
                href={ctaHref}
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--primary-fg)]"
              >
                {ctaLabel}
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export const NavBarSimpleDefinition: BlockDefinition = {
  type: 'NavBarSimple',
  label: 'Nav: Simple',
  description: 'Logo on the left, horizontal links on the right, with a mobile drawer',
  category: 'Navigation',
  defaultProps: {
    logoText: 'Brand',
    sticky: true,
    bordered: true,
    ctaLabel: '',
    ctaHref: '#',
    navItems: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  schema: {
    logoText: { label: 'Logo Text', type: 'text', placeholder: 'Brand' },
    sticky:   { label: 'Sticky',    type: 'boolean' },
    bordered: { label: 'Border',    type: 'boolean' },
    ctaLabel: { label: 'CTA Label', type: 'text', placeholder: 'Get Started' },
    ctaHref:  { label: 'CTA URL',   type: 'url',  placeholder: '/signup' },
    navItems: {
      label: 'Nav Items',
      type: 'repeater',
      fields: {
        label: { label: 'Label', type: 'text', placeholder: 'Home' },
        href:  { label: 'URL',   type: 'url',  placeholder: '/' },
      },
    },
  },
  Component: NavBarSimple as unknown as BlockDefinition['Component'],
}

export default NavBarSimple
