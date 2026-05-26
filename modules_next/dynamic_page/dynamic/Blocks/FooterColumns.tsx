'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt } from '@fortawesome/free-solid-svg-icons'
import type { BlockDefinition } from '../types'

type ColumnLink = { label?: string; href?: string }
type FooterColumn = { title?: string; links?: ColumnLink[] }

function FooterColumns(rawProps: Record<string, unknown>) {
  const brandText = (rawProps.brandText as string) || 'Brand'
  const brandTagline = (rawProps.brandTagline as string) || ''
  const columns = ((rawProps.columns as FooterColumn[]) || []).filter((c) => c?.title)
  const copyright = (rawProps.copyright as string) || ''
  const statusLabel = (rawProps.statusLabel as string) || ''

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-raised)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <a href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--primary)] text-[var(--primary-fg)]">
                <FontAwesomeIcon icon={faBolt} className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)]">{brandText}</span>
            </a>
            {brandTagline && (
              <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed max-w-[180px]">
                {brandTagline}
              </p>
            )}
          </div>
          {columns.map((col, cidx) => (
            <div key={`${col.title}-${cidx}`}>
              <p className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest mb-4">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {(col.links ?? []).filter((l) => l?.label).map((link, lidx) => (
                  <li key={`${link.label}-${lidx}`}>
                    <a
                      href={link.href ?? '#'}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
          {copyright && (
            <p className="text-xs text-[var(--text-secondary)]">{copyright}</p>
          )}
          {statusLabel && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
              <span className="text-xs text-[var(--text-secondary)]">{statusLabel}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

export const FooterColumnsDefinition: BlockDefinition = {
  type: 'FooterColumns',
  label: 'Footer: Columns',
  description: 'Multi-column footer with brand block, 3 link columns and a bottom status bar',
  category: 'Footer',
  defaultProps: {
    brandText: 'Velox',
    brandTagline: 'Ship better products, faster. Trusted by 5,000+ teams worldwide.',
    copyright: '© 2026 Velox, Inc. All rights reserved.',
    statusLabel: 'All systems operational',
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'Features',  href: '/features' },
          { label: 'Pricing',   href: '/pricing' },
          { label: 'Changelog', href: '/changelog' },
          { label: 'Roadmap',   href: '/roadmap' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About',   href: '/about' },
          { label: 'Blog',    href: '/blog' },
          { label: 'Careers', href: '/careers' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy',  href: '/privacy' },
          { label: 'Terms',    href: '/terms' },
          { label: 'Cookies',  href: '/cookies' },
        ],
      },
    ],
  },
  schema: {
    brandText:    { label: 'Brand Text',    type: 'text', placeholder: 'Velox' },
    brandTagline: { label: 'Brand Tagline', type: 'textarea', placeholder: 'Short pitch / tagline' },
    copyright:    { label: 'Copyright',     type: 'text', placeholder: '© 2026 Brand Inc.' },
    statusLabel:  { label: 'Status Label',  type: 'text', placeholder: 'All systems operational' },
    columns: {
      label: 'Columns',
      type: 'repeater',
      fields: {
        title: { label: 'Column Title', type: 'text', placeholder: 'Product' },
        links: {
          label: 'Links', type: 'repeater',
          fields: {
            label: { label: 'Label', type: 'text', placeholder: 'Pricing' },
            href:  { label: 'URL',   type: 'url',  placeholder: '/pricing' },
          },
        },
      },
    },
  },
  Component: FooterColumns as unknown as BlockDefinition['Component'],
}

export default FooterColumns
