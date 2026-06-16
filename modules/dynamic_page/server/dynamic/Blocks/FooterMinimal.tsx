'use client'
import { cn } from '@nb/common/server/utils/cn'
import { Badge } from '@nb/common/ui/Badge'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXTwitter, faGithub, faLinkedin, faInstagram, faYoutube, faFacebook } from '@fortawesome/free-brands-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { BlockDefinition } from '../types'

type FooterLink = { label?: string; href?: string }
type SocialLink = { platform?: string; href?: string }

type FooterStatus = 'operational' | 'degraded' | 'outage'

const STATUS_CONFIG: Record<FooterStatus, { variant: 'success' | 'warning' | 'error'; label: string }> = {
  operational: { variant: 'success', label: 'Operational' },
  degraded:    { variant: 'warning', label: 'Degraded'    },
  outage:      { variant: 'error',   label: 'Outage'      },
}

const SOCIAL_ICONS: Record<string, IconDefinition> = {
  twitter: faXTwitter,
  x: faXTwitter,
  github: faGithub,
  linkedin: faLinkedin,
  instagram: faInstagram,
  youtube: faYoutube,
  facebook: faFacebook,
}

function FooterMinimal(rawProps: Record<string, unknown>) {
  const logoText = (rawProps.logoText as string) || ''
  const navLinks = ((rawProps.navLinks as FooterLink[]) || []).filter((l) => l?.label)
  const socialLinks = ((rawProps.socialLinks as SocialLink[]) || []).filter((s) => s?.href)
  const version = (rawProps.version as string) || ''
  const status = (rawProps.status as FooterStatus | '') || ''
  const copyright = (rawProps.copyright as string) || ''
  const statusCfg = status && STATUS_CONFIG[status as FooterStatus]

  return (
    <footer className={cn('w-full border-t border-[var(--border)] bg-[var(--surface-raised)]')}>
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            {logoText && (
              <span className="text-sm font-bold text-[var(--text-primary)]">{logoText}</span>
            )}
            {version && <Badge variant="neutral" size="md">v{version}</Badge>}
          </div>

          {navLinks.length > 0 && (
            <nav aria-label="Footer navigation" className="flex items-center gap-1">
              {navLinks.map((link, idx) => (
                <a
                  key={`${link.label}-${idx}`}
                  href={link.href ?? '#'}
                  className="px-2 py-1 rounded text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {statusCfg && (
            <Badge variant={statusCfg.variant} size="md" dot>
              {statusCfg.label}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-3">
          {copyright && (
            <p className="text-xs text-[var(--text-secondary)]">{copyright}</p>
          )}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-1">
              {socialLinks.map((s, idx) => {
                const icon = SOCIAL_ICONS[(s.platform || '').toLowerCase()]
                if (!icon) return null
                return (
                  <a
                    key={`${s.platform}-${idx}`}
                    href={s.href ?? '#'}
                    aria-label={s.platform}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
                  >
                    <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

export const FooterMinimalDefinition: BlockDefinition = {
  type: 'FooterMinimal',
  label: 'Footer: Minimal',
  description: 'Two-row compact footer with logo, version, nav links, status badge and social icons',
  category: 'Footer',
  defaultProps: {
    logoText: 'Brand',
    version: '',
    status: 'operational',
    copyright: '© 2026 Your Company. All rights reserved.',
    navLinks: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms',   href: '/terms' },
    ],
    socialLinks: [
      { platform: 'twitter', href: 'https://x.com' },
      { platform: 'github',  href: 'https://github.com' },
    ],
  },
  schema: {
    logoText:  { label: 'Logo Text',   type: 'text', placeholder: 'Brand' },
    version:   { label: 'Version',     type: 'text', placeholder: '2.0.0' },
    status: {
      label: 'Status', type: 'select',
      options: [
        { label: '— None —',   value: '' },
        { label: 'Operational', value: 'operational' },
        { label: 'Degraded',    value: 'degraded' },
        { label: 'Outage',      value: 'outage' },
      ],
    },
    copyright: { label: 'Copyright',   type: 'text', placeholder: '© 2026 Brand Inc.' },
    navLinks: {
      label: 'Nav Links',
      type: 'repeater',
      fields: {
        label: { label: 'Label', type: 'text', placeholder: 'Privacy' },
        href:  { label: 'URL',   type: 'url',  placeholder: '/privacy' },
      },
    },
    socialLinks: {
      label: 'Social Links',
      type: 'repeater',
      fields: {
        platform: {
          label: 'Platform', type: 'select',
          options: ['twitter', 'github', 'linkedin', 'instagram', 'youtube', 'facebook'],
        },
        href: { label: 'URL', type: 'url', placeholder: 'https://...' },
      },
    },
  },
  Component: FooterMinimal as unknown as BlockDefinition['Component'],
}

export default FooterMinimal
