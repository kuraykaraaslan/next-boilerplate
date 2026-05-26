'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXTwitter, faInstagram, faPinterest, faFacebook, faYoutube } from '@fortawesome/free-brands-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { BlockDefinition } from '../types'

type ColumnLink = { label?: string; href?: string }
type FooterColumn = { heading?: string; links?: ColumnLink[] }
type SocialLink = { platform?: string; href?: string }

const SOCIAL_ICONS: Record<string, IconDefinition> = {
  twitter: faXTwitter,
  x: faXTwitter,
  instagram: faInstagram,
  pinterest: faPinterest,
  facebook: faFacebook,
  youtube: faYoutube,
}

function FooterCommerce(rawProps: Record<string, unknown>) {
  const logoText = (rawProps.logoText as string) || 'Shop'
  const logoAccent = (rawProps.logoAccent as string) || 'Flow'
  const brandTagline = (rawProps.brandTagline as string) || ''
  const columns = ((rawProps.columns as FooterColumn[]) || []).filter((c) => c?.heading)
  const socialLinks = ((rawProps.socialLinks as SocialLink[]) || []).filter((s) => s?.href)
  const copyright = (rawProps.copyright as string) || ''
  const bottomLinks = ((rawProps.bottomLinks as ColumnLink[]) || []).filter((l) => l?.label)

  return (
    <footer className="bg-[var(--surface-raised)] border-t border-[var(--border)] mt-16">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 space-y-4">
            <a href="/" className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
              {logoText}<span className="text-[var(--success-fg)]">{logoAccent}</span>
            </a>
            {brandTagline && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
                {brandTagline}
              </p>
            )}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((s, idx) => {
                  const icon = SOCIAL_ICONS[(s.platform || '').toLowerCase()]
                  if (!icon) return null
                  return (
                    <a
                      key={`${s.platform}-${idx}`}
                      href={s.href ?? '#'}
                      aria-label={s.platform}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--success-fg)] hover:border-[var(--success-fg)] transition-colors"
                    >
                      <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {columns.map((col, cidx) => (
            <div key={`${col.heading}-${cidx}`} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)]">
                {col.heading}
              </h3>
              <ul className="space-y-2">
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

        <div className="mt-10 border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          {copyright && (
            <p className="text-xs text-[var(--text-secondary)]">{copyright}</p>
          )}
          {bottomLinks.length > 0 && (
            <div className="flex gap-4">
              {bottomLinks.map((link, idx) => (
                <a
                  key={`${link.label}-${idx}`}
                  href={link.href ?? '#'}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

export const FooterCommerceDefinition: BlockDefinition = {
  type: 'FooterCommerce',
  label: 'Footer: Commerce',
  description: '5-column commerce footer with brand block, social icons, link columns and a bottom legal bar',
  category: 'Footer',
  defaultProps: {
    logoText: 'Shop',
    logoAccent: 'Flow',
    brandTagline: 'Discover thousands of products you will love, delivered fast with easy returns.',
    copyright: '© 2026 ShopFlow, Inc. All rights reserved.',
    socialLinks: [
      { platform: 'twitter',   href: 'https://x.com' },
      { platform: 'instagram', href: 'https://instagram.com' },
      { platform: 'pinterest', href: 'https://pinterest.com' },
    ],
    bottomLinks: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms',          href: '/terms' },
      { label: 'Accessibility',  href: '/accessibility' },
    ],
    columns: [
      {
        heading: 'Shop',
        links: [
          { label: 'All Products', href: '/products' },
          { label: 'Electronics', href: '/category/electronics' },
          { label: 'Clothing',    href: '/category/clothing' },
        ],
      },
      {
        heading: 'Account',
        links: [
          { label: 'My Orders', href: '/orders' },
          { label: 'My Cart',   href: '/cart' },
          { label: 'Wishlist',  href: '/wishlist' },
        ],
      },
      {
        heading: 'Help',
        links: [
          { label: 'FAQ',         href: '/faq' },
          { label: 'Shipping',    href: '/shipping' },
          { label: 'Returns',     href: '/returns' },
          { label: 'Contact Us',  href: '/contact' },
        ],
      },
      {
        heading: 'Company',
        links: [
          { label: 'About Us', href: '/about' },
          { label: 'Blog',     href: '/blog' },
          { label: 'Careers',  href: '/careers' },
        ],
      },
    ],
  },
  schema: {
    logoText:     { label: 'Logo Text',    type: 'text', placeholder: 'Shop' },
    logoAccent:   { label: 'Logo Accent',  type: 'text', placeholder: 'Flow' },
    brandTagline: { label: 'Brand Tagline', type: 'textarea' },
    copyright:    { label: 'Copyright',    type: 'text' },
    socialLinks: {
      label: 'Social Links',
      type: 'repeater',
      fields: {
        platform: {
          label: 'Platform', type: 'select',
          options: ['twitter', 'instagram', 'pinterest', 'facebook', 'youtube'],
        },
        href: { label: 'URL', type: 'url', placeholder: 'https://...' },
      },
    },
    bottomLinks: {
      label: 'Bottom Bar Links',
      type: 'repeater',
      fields: {
        label: { label: 'Label', type: 'text', placeholder: 'Privacy' },
        href:  { label: 'URL',   type: 'url',  placeholder: '/privacy' },
      },
    },
    columns: {
      label: 'Columns',
      type: 'repeater',
      fields: {
        heading: { label: 'Heading', type: 'text', placeholder: 'Shop' },
        links: {
          label: 'Links', type: 'repeater',
          fields: {
            label: { label: 'Label', type: 'text', placeholder: 'All Products' },
            href:  { label: 'URL',   type: 'url',  placeholder: '/products' },
          },
        },
      },
    },
  },
  Component: FooterCommerce as unknown as BlockDefinition['Component'],
}

export default FooterCommerce
