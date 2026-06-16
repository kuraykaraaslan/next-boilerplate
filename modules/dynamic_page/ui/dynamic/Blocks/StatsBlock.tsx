'use client'

import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/BaseBlock'
import { defineBlock } from '../utils/defineBlock'

interface StatItem {
  value?: string
  label?: string
  prefix?: string
  suffix?: string
}

interface StatsProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  columns?: string
  style?: string
  stats?: StatItem[]
}

function StatsBlock(rawProps: StatsProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)

  const heading    = rawProps.heading    || ''
  const subheading = rawProps.subheading || ''
  const columns    = rawProps.columns    || '4'
  const style      = rawProps.style      || 'simple'
  const stats      = (rawProps.stats as StatItem[] | undefined) || []

  const colClass: Record<string, string> = {
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-3',
    '4': 'grid-cols-2 sm:grid-cols-4',
  }

  const itemClass = style === 'card'
    ? 'flex flex-col items-center text-center p-6 rounded-2xl bg-[var(--surface-raised)] border border-[var(--text-primary)]/10'
    : style === 'bordered'
      ? 'flex flex-col items-center text-center p-6 border-l border-[var(--text-primary)]/15 first:border-0'
      : 'flex flex-col items-center text-center'

  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-16`}>
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && (
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">{heading}</h2>
            )}
            {subheading && (
              <p className="text-lg text-[var(--text-secondary)]">{subheading}</p>
            )}
          </div>
        )}

        <div className={`grid ${colClass[columns] ?? colClass['4']} gap-8`}>
          {stats.map((stat, i) => (
            <div key={i} className={itemClass}>
              <p className="text-4xl md:text-5xl font-extrabold text-[var(--primary)] tracking-tight tabular-nums">
                {stat.prefix && <span className="text-3xl">{stat.prefix}</span>}
                {stat.value || '0'}
                {stat.suffix && <span className="text-3xl">{stat.suffix}</span>}
              </p>
              {stat.label && (
                <p className="mt-2 text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">{stat.label}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </BaseBlock>
  )
}

export const StatsBlockDefinition = defineBlock<StatsProps>({
  type: 'StatsBlock',
  label: 'Stats',
  category: 'Content',
  description: 'Key metrics displayed as large numbers with labels.',
  schema: {
    heading:    { label: 'Heading',    type: 'text',     placeholder: 'By the numbers', group: 'Content' },
    subheading: { label: 'Subheading', type: 'textarea', placeholder: 'Supporting copy…', group: 'Content' },
    columns: {
      label: 'Columns',
      type: 'select',
      options: [
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ],
      group: 'Layout',
    },
    style: {
      label: 'Item Style',
      type: 'select',
      options: [
        { label: 'Simple (no border)', value: 'simple' },
        { label: 'Cards',              value: 'card' },
        { label: 'Bordered dividers',  value: 'bordered' },
      ],
      group: 'Layout',
    },
    stats: {
      label: 'Stats',
      type: 'repeater',
      group: 'Content',
      fields: {
        prefix: { label: 'Prefix (e.g. $)', type: 'text', placeholder: '$' },
        value:  { label: 'Value',           type: 'text', placeholder: '10,000' },
        suffix: { label: 'Suffix (e.g. +)', type: 'text', placeholder: '+' },
        label:  { label: 'Label',           type: 'text', placeholder: 'Users worldwide' },
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading:    '',
    subheading: '',
    columns:    '4',
    style:      'simple',
    stats: [
      { prefix: '',  value: '10K+',  suffix: '', label: 'Active Users' },
      { prefix: '$', value: '2M',    suffix: '+', label: 'Revenue Processed' },
      { prefix: '',  value: '99.9',  suffix: '%', label: 'Uptime SLA' },
      { prefix: '',  value: '4.9',   suffix: '/5', label: 'Customer Rating' },
    ],
    blockClass: 'bg-[var(--surface-base)]',
    sectionId: 'stats',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    {
      id: 'simple-4col',
      label: 'Simple',
      description: '4 stats, no background',
      overrides: { columns: '4', style: 'simple' },
    },
    {
      id: 'cards-4col',
      label: 'Cards',
      description: '4 stats in bordered cards',
      overrides: { columns: '4', style: 'card' },
    },
    {
      id: 'bordered-3col',
      label: 'Bordered 3-col',
      description: '3 stats with divider borders',
      overrides: { columns: '3', style: 'bordered' },
    },
  ],
  defaultVariant: 'simple-4col',
  Component: StatsBlock,
})

export default StatsBlock
