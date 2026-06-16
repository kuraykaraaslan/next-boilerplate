'use client'

import { cn } from '@nb/common/server/utils/cn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import type { MegaSection, NavLink, ICON_MAP_TYPE } from '../NavBarMarketing.types'

interface Props {
  megaSections: MegaSection[]
  inlineLinks: NavLink[]
  signInLabel: string
  signInHref: string
  ctaLabel: string
  ctaHref: string
  iconMap: ICON_MAP_TYPE
  mobileExpanded: string | null
  onSetMobileExpanded: (id: string | null) => void
  onClose: () => void
}

export function NavBarMobilePanel({
  megaSections, inlineLinks, signInLabel, signInHref,
  ctaLabel, ctaHref, iconMap,
  mobileExpanded, onSetMobileExpanded, onClose,
}: Props) {
  return (
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
                onClick={() => onSetMobileExpanded(isExp ? null : id)}
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
                    const icon = item.icon ? iconMap[item.icon] : undefined
                    return (
                      <a
                        key={`${item.label}-${iidx}`}
                        href={item.href ?? '#'}
                        onClick={onClose}
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
            onClick={onClose}
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
                onClick={onClose}
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
  )
}
