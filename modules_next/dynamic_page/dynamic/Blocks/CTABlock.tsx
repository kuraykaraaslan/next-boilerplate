'use client'

import Link from 'next/link'
import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/BaseBlock'
import { defineBlock } from '../utils/defineBlock'
import type { LinkValue } from '../types'

interface CTAProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  cta?: LinkValue
  ctaSecondary?: LinkValue
  layout?: string
}

function CTABlock(rawProps: CTAProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)

  const heading       = rawProps.heading       || ''
  const subheading    = rawProps.subheading    || ''
  const cta           = rawProps.cta           as LinkValue | undefined
  const ctaSecondary  = rawProps.ctaSecondary  as LinkValue | undefined
  const layout        = rawProps.layout        || 'centered'

  const ctaEl = cta?.label ? (
    <Link
      href={cta.href || '#'}
      target={cta.target}
      className="inline-block px-8 py-3.5 text-base font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 hover:scale-[1.02] transition-all"
    >
      {cta.label}
    </Link>
  ) : null

  const ctaSecEl = ctaSecondary?.label ? (
    <Link
      href={ctaSecondary.href || '#'}
      target={ctaSecondary.target}
      className="inline-block px-8 py-3.5 text-base font-semibold rounded-lg border border-current opacity-70 hover:opacity-100 transition-all"
    >
      {ctaSecondary.label}
    </Link>
  ) : null

  if (layout === 'side-by-side') {
    return (
      <BaseBlock {...baseProps}>
        <div className={`${contentClass} py-16`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex-1">
              {heading && (
                <h2 className="text-2xl md:text-3xl font-bold mb-3">{heading}</h2>
              )}
              {subheading && (
                <p className="text-base opacity-75">{subheading}</p>
              )}
            </div>
            {(ctaEl || ctaSecEl) && (
              <div className="flex flex-wrap items-center gap-4 flex-shrink-0">
                {ctaEl}
                {ctaSecEl}
              </div>
            )}
          </div>
        </div>
      </BaseBlock>
    )
  }

  // default: centered
  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-20 text-center`}>
        {heading && (
          <h2 className="text-3xl md:text-4xl font-bold mb-5">{heading}</h2>
        )}
        {subheading && (
          <p className="text-lg opacity-75 mb-10 max-w-2xl mx-auto">{subheading}</p>
        )}
        {(ctaEl || ctaSecEl) && (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {ctaEl}
            {ctaSecEl}
          </div>
        )}
      </div>
    </BaseBlock>
  )
}

export const CTABlockDefinition = defineBlock<CTAProps>({
  type: 'CTABlock',
  label: 'Call to Action',
  category: 'CTA',
  description: 'Full-width call-to-action section with heading, subtext, and action buttons.',
  schema: {
    heading:      { label: 'Heading',           type: 'text',     placeholder: 'Ready to get started?', group: 'Content' },
    subheading:   { label: 'Subheading',         type: 'textarea', placeholder: 'Supporting copy…', group: 'Content' },
    cta:          { label: 'Primary Button',     type: 'link',     group: 'Content' },
    ctaSecondary: { label: 'Secondary Button',   type: 'link',     group: 'Content' },
    layout: {
      label: 'Layout',
      type: 'select',
      options: [
        { label: 'Centered', value: 'centered' },
        { label: 'Side by Side', value: 'side-by-side' },
      ],
      group: 'Layout',
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading:      'Ready to Get Started?',
    subheading:   'Join thousands of teams already using our platform to ship faster.',
    cta:          { label: 'Start for Free', href: '/signup', target: '_self' },
    ctaSecondary: { label: 'Talk to Sales', href: '/contact', target: '_self' },
    layout:       'centered',
    blockClass:   'bg-[var(--primary)] text-white',
    sectionId:    'cta',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    {
      id: 'centered-primary',
      label: 'Centered',
      description: 'Centered layout on primary colour background',
      overrides: { layout: 'centered', blockClass: 'bg-[var(--primary)] text-white' },
    },
    {
      id: 'side-by-side',
      label: 'Side-by-Side',
      description: 'Text left, buttons right',
      overrides: { layout: 'side-by-side', blockClass: 'bg-[var(--surface-raised)]' },
    },
    {
      id: 'centered-dark',
      label: 'Dark',
      description: 'Centered on dark surface',
      overrides: { layout: 'centered', blockClass: 'bg-[var(--surface-overlay)] text-[var(--text-primary)]' },
    },
  ],
  defaultVariant: 'centered-primary',
  Component: CTABlock,
})

export default CTABlock
