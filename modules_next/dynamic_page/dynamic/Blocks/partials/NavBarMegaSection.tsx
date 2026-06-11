'use client'

import { cn } from '@/modules_next/common/utils/cn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import type { MegaSection, ICON_MAP_TYPE } from '../NavBarMarketing.types'

interface Props {
  section: MegaSection
  id: string
  isOpen: boolean
  iconMap: ICON_MAP_TYPE
  onOpen: (id: string) => void
  onScheduleClose: () => void
  onCancelClose: () => void
}

export function NavBarMegaSection({ section, id, isOpen, iconMap, onOpen, onScheduleClose, onCancelClose }: Props) {
  const items = (section.items ?? []).filter((i) => i?.label)
  const hasFeatured = Boolean(section.featuredTitle)
  const width = section.width || (hasFeatured ? '600' : '400')

  return (
    <div
      className="relative"
      onMouseEnter={() => onOpen(id)}
      onMouseLeave={onScheduleClose}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => (isOpen ? onScheduleClose() : onOpen(id))}
        className={cn(
          'inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isOpen
            ? 'bg-[var(--surface-overlay)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]',
        )}
      >
        {section.trigger}
        <FontAwesomeIcon icon={faChevronDown} className={cn('w-2.5 h-2.5 transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          onMouseEnter={onCancelClose}
          onMouseLeave={onScheduleClose}
          style={{ width: `${width}px` }}
          className="absolute left-0 top-full mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-xl overflow-hidden"
        >
          <div className={cn('grid', hasFeatured ? 'grid-cols-[1fr_188px]' : 'grid-cols-1')}>
            <div className="p-3">
              <div className={cn('grid gap-0.5', items.length > 4 ? 'grid-cols-2' : 'grid-cols-1')}>
                {items.map((item, iidx) => {
                  const icon = item.icon ? iconMap[item.icon] : undefined
                  return (
                    <a
                      key={`${item.label}-${iidx}`}
                      href={item.href ?? '#'}
                      onClick={onScheduleClose}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
                    >
                      {icon && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--primary-subtle)] text-[var(--primary)] shrink-0">
                          <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">{item.description}</p>
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
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{section.featuredDescription}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {section.featuredPrimaryLabel && (
                    <a
                      href={section.featuredPrimaryHref || '#'}
                      onClick={onScheduleClose}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90"
                    >
                      {section.featuredPrimaryLabel}
                      <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" aria-hidden="true" />
                    </a>
                  )}
                  {section.featuredSecondaryLabel && (
                    <a
                      href={section.featuredSecondaryHref || '#'}
                      onClick={onScheduleClose}
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
}
