'use client'

import Link from 'next/link'
import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/base-block.component'
import { defineBlock } from '../utils/defineBlock'
import type { LinkValue } from '../types'

interface PricingPlan {
  name?: string
  price?: string
  period?: string
  description?: string
  features?: string
  cta?: LinkValue
  highlighted?: boolean
  badge?: string
}

interface PricingTableProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  plans?: PricingPlan[]
}

function PricingTableBlock(rawProps: PricingTableProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)
  const heading    = rawProps.heading    || ''
  const subheading = rawProps.subheading || ''
  const plans      = (rawProps.plans as PricingPlan[] | undefined) || []

  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-20`}>
        {(heading || subheading) && (
          <div className="text-center mb-14">
            {heading    && <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">{heading}</h2>}
            {subheading && <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">{subheading}</p>}
          </div>
        )}

        <div className={`grid grid-cols-1 gap-6 ${plans.length === 2 ? 'sm:grid-cols-2' : plans.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
          {plans.map((plan, i) => {
            const featureList = (plan.features || '').split('\n').filter(Boolean)
            const cta = plan.cta as LinkValue | undefined
            const isHL = Boolean(plan.highlighted)

            return (
              <div
                key={i}
                className={`relative flex flex-col rounded-2xl p-8 border-2 transition-shadow ${
                  isHL
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-2xl scale-[1.02]'
                    : 'border-[var(--text-primary)]/10 bg-[var(--surface-raised)]'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${
                    isHL ? 'bg-white text-[var(--primary)]' : 'bg-[var(--primary)] text-white'
                  }`}>
                    {plan.badge}
                  </span>
                )}

                <div className="mb-6">
                  {plan.name && (
                    <p className={`text-sm font-semibold uppercase tracking-widest mb-3 ${isHL ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                      {plan.name}
                    </p>
                  )}
                  <div className="flex items-end gap-1 mb-2">
                    <span className={`text-4xl font-extrabold ${isHL ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                      {plan.price || '—'}
                    </span>
                    {plan.period && (
                      <span className={`text-sm mb-1 ${isHL ? 'text-white/60' : 'text-[var(--text-secondary)]'}`}>/{plan.period}</span>
                    )}
                  </div>
                  {plan.description && (
                    <p className={`text-sm ${isHL ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>{plan.description}</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {featureList.map((feat, fi) => (
                    <li key={fi} className={`flex items-start gap-2 text-sm ${isHL ? 'text-white/90' : 'text-[var(--text-primary)]'}`}>
                      <span className={`mt-0.5 flex-shrink-0 text-xs ${isHL ? 'text-white' : 'text-[var(--primary)]'}`}>✓</span>
                      {feat.replace(/^[-•✓]\s*/, '')}
                    </li>
                  ))}
                </ul>

                {cta?.label && (
                  <Link
                    href={cta.href || '#'}
                    target={cta.target}
                    className={`block text-center px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                      isHL
                        ? 'bg-white text-[var(--primary)] hover:bg-white/90'
                        : 'bg-[var(--primary)] text-white hover:opacity-90'
                    }`}
                  >
                    {cta.label}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </BaseBlock>
  )
}

export const PricingTableBlockDefinition = defineBlock<PricingTableProps>({
  type: 'PricingTableBlock',
  label: 'Pricing Table',
  category: 'CTA',
  description: 'Side-by-side pricing plans with feature lists and CTA buttons.',
  schema: {
    heading:    { label: 'Section Heading',    type: 'text',     placeholder: 'Simple, Transparent Pricing', group: 'Content' },
    subheading: { label: 'Section Subheading', type: 'textarea', placeholder: 'No hidden fees.', group: 'Content' },
    plans: {
      label: 'Pricing Plans', type: 'repeater', group: 'Content',
      fields: {
        name:        { label: 'Plan Name',     type: 'text',     placeholder: 'Pro' },
        price:       { label: 'Price',          type: 'text',     placeholder: '$49' },
        period:      { label: 'Period',         type: 'text',     placeholder: 'mo' },
        description: { label: 'Description',   type: 'text',     placeholder: 'For growing teams' },
        features:    { label: 'Features (one per line)', type: 'textarea', placeholder: 'Unlimited projects\nPriority support\nAdvanced analytics' },
        badge:       { label: 'Badge (e.g. Most Popular)', type: 'text', placeholder: 'Most Popular' },
        highlighted: { label: 'Highlighted plan', type: 'boolean' },
        cta:         { label: 'CTA Button', type: 'link' } as never,
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading: 'Simple, Transparent Pricing',
    subheading: 'Start for free. Upgrade when you need more.',
    plans: [
      {
        name: 'Starter', price: 'Free', period: '', description: 'For individuals and small projects.',
        features: 'Up to 3 projects\n1 GB storage\nCommunity support',
        badge: '', highlighted: false,
        cta: { label: 'Get started free', href: '/signup', target: '_self' },
      },
      {
        name: 'Pro', price: '$49', period: 'mo', description: 'For growing teams.',
        features: 'Unlimited projects\n50 GB storage\nPriority support\nAdvanced analytics\nCustom domain',
        badge: 'Most Popular', highlighted: true,
        cta: { label: 'Start free trial', href: '/signup/pro', target: '_self' },
      },
      {
        name: 'Enterprise', price: 'Custom', period: '', description: 'For large organisations.',
        features: 'Everything in Pro\nDedicated success manager\nSSO / SAML\nSLA guarantee\nCustom contracts',
        badge: '', highlighted: false,
        cta: { label: 'Contact sales', href: '/contact', target: '_self' },
      },
    ],
    blockClass: 'bg-[var(--surface-base)]', sectionId: 'pricing',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  Component: PricingTableBlock,
})

export default PricingTableBlock
