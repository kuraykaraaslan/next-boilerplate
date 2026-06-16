'use client'

import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/base-block.component'
import { defineBlock } from '../utils/defineBlock'

interface TimelineItem { date?: string; title?: string; description?: string; icon?: string }

interface TimelineProps extends Record<string, unknown> {
  heading?: string; subheading?: string
  layout?: string; style?: string
  dotColor?: string
  items?: TimelineItem[]
}

// Dot accent options — maps to a Tailwind bg class
const DOT_BG: Record<string, string> = {
  primary:   'bg-[var(--primary)]',
  secondary: 'bg-[var(--secondary)]',
  dark:      'bg-[var(--text-primary)]',
  slate:     'bg-slate-400',
}

function Dot({ item, index, dotColor }: { item: TimelineItem; index: number; dotColor: string }) {
  const bg = DOT_BG[dotColor] ?? DOT_BG.primary
  return (
    <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0 z-10 relative`}>
      {item.icon || (index + 1)}
    </div>
  )
}

function ItemContent({ item, cardStyle, align = 'left' }: { item: TimelineItem; cardStyle: boolean; align?: 'left' | 'right' }) {
  const textAlign = align === 'right' ? 'text-right' : 'text-left'
  const inner = (
    <>
      {item.date  && <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-1">{item.date}</p>}
      {item.title && <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1 leading-snug">{item.title}</h3>}
      {item.description && <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.description}</p>}
    </>
  )
  if (cardStyle) {
    return (
      <div className={`${textAlign} p-5 rounded-xl bg-[var(--surface-raised)] border border-[var(--text-primary)]/8 shadow-sm`}>
        {inner}
      </div>
    )
  }
  return <div className={textAlign}>{inner}</div>
}

function TimelineBlock(rawProps: TimelineProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)
  const heading    = rawProps.heading    || ''
  const subheading = rawProps.subheading || ''
  const layout     = (rawProps.layout   as string) || 'left'
  const style      = (rawProps.style    as string) || 'default'
  const dotColor   = (rawProps.dotColor as string) || 'primary'
  const items      = (rawProps.items as TimelineItem[] | undefined) || []

  const isCard = style === 'card'
  const isCentered = layout === 'centered'

  const sectionHeader = (heading || subheading) ? (
    <div className="text-center mb-14">
      {heading    && <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">{heading}</h2>}
      {subheading && <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">{subheading}</p>}
    </div>
  ) : null

  // ── Centered / alternating ─────────────────────────────────────────────────
  if (isCentered) {
    return (
      <BaseBlock {...baseProps}>
        <div className={`${contentClass} py-20`}>
          {sectionHeader}
          <div className="relative max-w-3xl mx-auto">
            {/* Center line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-[var(--text-primary)]/12" />
            <div className="space-y-10">
              {items.map((item, i) => {
                const isRight = i % 2 === 0
                return (
                  <div key={i} className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-x-6">
                    {/* Left cell */}
                    <div className={isRight ? 'invisible' : ''}>
                      <ItemContent item={item} cardStyle={isCard} align="right" />
                    </div>
                    {/* Dot (center column) */}
                    <div className="mt-1">
                      <Dot item={item} index={i} dotColor={dotColor} />
                    </div>
                    {/* Right cell */}
                    <div className={isRight ? '' : 'invisible'}>
                      <ItemContent item={item} cardStyle={isCard} align="left" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </BaseBlock>
    )
  }

  // ── Left-aligned ───────────────────────────────────────────────────────────
  // pl-12 (48px) makes room for the w-9 (36px) dot + 12px gap
  // Line sits at left-[18px] = center of 36px dot (36/2 = 18px from left of container)
  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-20`}>
        {sectionHeader}
        <div className="relative pl-12 max-w-2xl">
          {/* Vertical line — centered on dots */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-[var(--text-primary)]/12" />
          <div className="space-y-10">
            {items.map((item, i) => (
              <div key={i} className="relative">
                {/* Dot — sits on the line */}
                <div className="absolute -left-12 top-0">
                  <Dot item={item} index={i} dotColor={dotColor} />
                </div>
                {/* Content — padded top to align with dot center */}
                <div className="pt-1">
                  <ItemContent item={item} cardStyle={isCard} align="left" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseBlock>
  )
}

export const TimelineBlockDefinition = defineBlock<TimelineProps>({
  type: 'TimelineBlock',
  label: 'Timeline',
  category: 'Content',
  description: 'Vertical timeline for company history, roadmap, or process steps.',
  schema: {
    heading:    { label: 'Section Heading',    type: 'text',     placeholder: 'Our Journey', group: 'Content' },
    subheading: { label: 'Section Subheading', type: 'textarea', placeholder: 'How we got here…', group: 'Content' },
    layout: {
      label: 'Layout', type: 'select', group: 'Layout',
      options: [
        { label: 'Left-aligned',          value: 'left' },
        { label: 'Centered (alternating)', value: 'centered' },
      ],
    },
    style: {
      label: 'Item Style', type: 'select', group: 'Layout',
      options: [
        { label: 'Minimal (no background)', value: 'default' },
        { label: 'Card (raised panel)',      value: 'card' },
      ],
    },
    dotColor: {
      label: 'Dot Color', type: 'select', group: 'Layout',
      options: [
        { label: 'Primary',   value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Dark',      value: 'dark' },
        { label: 'Slate',     value: 'slate' },
      ],
    },
    items: {
      label: 'Timeline Items', type: 'repeater', group: 'Content',
      fields: {
        date:        { label: 'Date / Label',  type: 'text',     placeholder: '2019' },
        title:       { label: 'Title',          type: 'text',     placeholder: 'Company founded' },
        description: { label: 'Description',   type: 'textarea', placeholder: 'Short description…' },
        icon:        { label: 'Icon (emoji)',   type: 'text',     placeholder: '🚀' },
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading: 'Our Journey', subheading: '',
    layout: 'left', style: 'card', dotColor: 'primary',
    items: [
      { date: '2019', title: 'Founded',              description: 'Started with a small team and a big idea.',   icon: '🚀' },
      { date: '2020', title: 'First 1,000 customers', description: 'Hit our first major milestone.',              icon: '🎯' },
      { date: '2022', title: 'Series A raised',       description: '$10M to accelerate growth.',                  icon: '💰' },
      { date: '2024', title: '10K+ customers',        description: 'Serving teams in 50+ countries.',             icon: '🌍' },
    ],
    blockClass: 'bg-[var(--surface-base)]', sectionId: 'timeline',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    { id: 'left-card',     label: 'Left (cards)',     description: 'Left-aligned with card panels', overrides: { layout: 'left',     style: 'card'    } },
    { id: 'left-minimal',  label: 'Left (minimal)',   description: 'Left-aligned, no card bg',      overrides: { layout: 'left',     style: 'default' } },
    { id: 'centered-card', label: 'Centered (cards)', description: 'Alternating sides with cards',  overrides: { layout: 'centered', style: 'card'    } },
  ],
  defaultVariant: 'left-card',
  Component: TimelineBlock,
})

export default TimelineBlock
