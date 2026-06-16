'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/base-block.component'
import { defineBlock } from '../utils/defineBlock'
import { getIconDef } from '../Editor/partials/icon-picker-field.component'

interface Feature {
  icon?: string
  title?: string
  description?: string
}

interface FeatureGridProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  columns?: string
  style?: string
  features?: Feature[]
}

function FeatureGridBlock(rawProps: FeatureGridProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)

  const heading    = rawProps.heading    || ''
  const subheading = rawProps.subheading || ''
  const columns    = rawProps.columns    || '3'
  const style      = rawProps.style      || 'simple'
  const features   = (rawProps.features as Feature[] | undefined) || []

  const colClass: Record<string, string> = {
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  const itemBase = style === 'card'
    ? 'flex flex-col gap-4 p-6 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface-raised)] hover:border-[var(--primary)]/30 transition-colors'
    : 'flex flex-col gap-4'

  const iconWrap = style === 'icon-circle'
    ? 'w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0'
    : 'w-10 h-10 flex items-center justify-center flex-shrink-0'

  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-20`}>
        {(heading || subheading) && (
          <div className="text-center mb-14">
            {heading && (
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">{heading}</h2>
            )}
            {subheading && (
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">{subheading}</p>
            )}
          </div>
        )}

        <div className={`grid ${colClass[columns] ?? colClass['3']} gap-8`}>
          {features.map((feat, i) => {
            const iconDef = feat.icon ? getIconDef(feat.icon) : undefined
            return (
              <div key={i} className={itemBase}>
                {iconDef && (
                  <div className={iconWrap}>
                    <FontAwesomeIcon
                      icon={iconDef}
                      className="w-5 h-5 text-[var(--primary)]"
                    />
                  </div>
                )}
                {feat.title && (
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{feat.title}</h3>
                )}
                {feat.description && (
                  <p className="text-[var(--text-secondary)] leading-relaxed text-sm">{feat.description}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </BaseBlock>
  )
}

export const FeatureGridBlockDefinition = defineBlock<FeatureGridProps>({
  type: 'FeatureGridBlock',
  label: 'Feature Grid',
  category: 'Content',
  description: 'Responsive grid of features with icons, titles, and descriptions.',
  schema: {
    heading:    { label: 'Section Heading',  type: 'text',     placeholder: 'Why choose us', group: 'Content' },
    subheading: { label: 'Section Subheading', type: 'textarea', placeholder: 'Supporting copy…', group: 'Content' },
    columns: {
      label: 'Columns',
      type: 'select',
      options: [
        { label: '2 Columns', value: '2' },
        { label: '3 Columns (default)', value: '3' },
        { label: '4 Columns', value: '4' },
      ],
      group: 'Layout',
    },
    style: {
      label: 'Item Style',
      type: 'select',
      options: [
        { label: 'Simple', value: 'simple' },
        { label: 'Card (bordered)', value: 'card' },
        { label: 'Icon Circle', value: 'icon-circle' },
      ],
      group: 'Layout',
    },
    features: {
      label: 'Features',
      type: 'repeater',
      group: 'Content',
      fields: {
        icon:        { label: 'Icon name', type: 'text', placeholder: 'e.g. rocket, check, bolt' },
        title:       { label: 'Title',       type: 'text',     placeholder: 'Feature title' },
        description: { label: 'Description', type: 'textarea', placeholder: 'Short description…' },
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading:    'Everything You Need',
    subheading: 'Built to scale with your business from day one.',
    columns:    '3',
    style:      'card',
    features: [
      { icon: 'rocket',    title: 'Fast Setup',     description: 'Get started in minutes with our guided onboarding flow.' },
      { icon: 'shield',    title: 'Secure by Default', description: 'Enterprise-grade security and compliance built in.' },
      { icon: 'bolt',      title: 'High Performance', description: 'Optimised for speed at any scale.' },
      { icon: 'globe',     title: 'Global CDN',      description: 'Your content delivered fast from any location.' },
      { icon: 'users',     title: 'Team Collaboration', description: 'Work together seamlessly with role-based access.' },
      { icon: 'chart-bar', title: 'Analytics',       description: 'Deep insights into your usage and performance.' },
    ],
    blockClass: 'bg-[var(--surface-base)]',
    sectionId: '',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    {
      id: 'cards-3col',
      label: '3-col Cards',
      description: 'Bordered cards in 3 columns',
      overrides: { columns: '3', style: 'card' },
    },
    {
      id: 'simple-3col',
      label: '3-col Simple',
      description: 'Simple list in 3 columns without borders',
      overrides: { columns: '3', style: 'simple' },
    },
    {
      id: 'icon-circle-2col',
      label: '2-col Icon Circle',
      description: 'Icon in circle, 2 columns',
      overrides: { columns: '2', style: 'icon-circle' },
    },
    {
      id: 'cards-4col',
      label: '4-col Cards',
      description: 'Compact bordered cards in 4 columns',
      overrides: { columns: '4', style: 'card' },
    },
  ],
  defaultVariant: 'cards-3col',
  Component: FeatureGridBlock,
})

export default FeatureGridBlock
