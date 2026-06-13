'use client'

import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/BaseBlock'
import { defineBlock } from '../utils/defineBlock'

interface FaqItem {
  question?: string
  answer?: string
}

interface FaqAccordionProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  layout?: string
  faqs?: FaqItem[]
}

function FaqAccordionBlock(rawProps: FaqAccordionProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)

  const heading    = rawProps.heading    || ''
  const subheading = rawProps.subheading || ''
  const layout     = rawProps.layout     || 'centered'
  const faqs       = (rawProps.faqs as FaqItem[] | undefined) || []

  const listEl = (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <details
          key={i}
          className="group border border-[var(--text-primary)]/10 rounded-xl overflow-hidden bg-[var(--surface-raised)]"
        >
          <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none">
            <span className="text-[var(--text-primary)] font-medium text-sm leading-snug">
              {faq.question || `Question ${i + 1}`}
            </span>
            <svg
              className="w-4 h-4 flex-shrink-0 text-[var(--text-primary)]/40 transition-transform duration-200 group-open:rotate-45"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </summary>
          {faq.answer && (
            <div className="px-5 pb-5 pt-1 border-t border-[var(--text-primary)]/8">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </details>
      ))}
    </div>
  )

  if (layout === 'two-col') {
    const half = Math.ceil(faqs.length / 2)
    const leftFaqs  = faqs.slice(0, half)
    const rightFaqs = faqs.slice(half)

    const colList = (items: FaqItem[], startIdx: number) => (
      <div className="space-y-2">
        {items.map((faq, i) => (
          <details
            key={i + startIdx}
            className="group border border-[var(--text-primary)]/10 rounded-xl overflow-hidden bg-[var(--surface-raised)]"
          >
            <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none">
              <span className="text-[var(--text-primary)] font-medium text-sm leading-snug">
                {faq.question || `Question ${i + startIdx + 1}`}
              </span>
              <svg
                className="w-4 h-4 flex-shrink-0 text-[var(--text-primary)]/40 transition-transform duration-200 group-open:rotate-45"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </summary>
            {faq.answer && (
              <div className="px-5 pb-5 pt-1 border-t border-[var(--text-primary)]/8">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </details>
        ))}
      </div>
    )

    return (
      <BaseBlock {...baseProps}>
        <div className={`${contentClass} py-20`}>
          {(heading || subheading) && (
            <div className="text-center mb-12">
              {heading && (
                <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">{heading}</h2>
              )}
              {subheading && (
                <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">{subheading}</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {colList(leftFaqs, 0)}
            {colList(rightFaqs, half)}
          </div>
        </div>
      </BaseBlock>
    )
  }

  // default: centered single column
  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-20`}>
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && (
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">{heading}</h2>
            )}
            {subheading && (
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">{subheading}</p>
            )}
          </div>
        )}
        <div className="max-w-2xl mx-auto">
          {listEl}
        </div>
      </div>
    </BaseBlock>
  )
}

export const FaqAccordionBlockDefinition = defineBlock<FaqAccordionProps>({
  type: 'FaqAccordionBlock',
  label: 'FAQ Accordion',
  category: 'Content',
  description: 'Frequently asked questions in an expandable accordion layout.',
  schema: {
    heading:    { label: 'Section Heading',    type: 'text',     placeholder: 'Frequently Asked Questions', group: 'Content' },
    subheading: { label: 'Section Subheading', type: 'textarea', placeholder: 'Everything you need to know…', group: 'Content' },
    layout: {
      label: 'Layout',
      type: 'select',
      options: [
        { label: 'Centered (single column)', value: 'centered' },
        { label: 'Two Columns',              value: 'two-col' },
      ],
      group: 'Layout',
    },
    faqs: {
      label: 'Questions',
      type: 'repeater',
      group: 'Content',
      fields: {
        question: { label: 'Question', type: 'text',     placeholder: 'How does it work?' },
        answer:   { label: 'Answer',   type: 'textarea', placeholder: 'Here\'s the detailed answer…' },
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading:    'Frequently Asked Questions',
    subheading: 'Can\'t find the answer you\'re looking for? Reach out to our support team.',
    layout:     'centered',
    faqs: [
      {
        question: 'How do I get started?',
        answer:   'Sign up for a free account and follow our quick-start guide. You\'ll be up and running in under 10 minutes.',
      },
      {
        question: 'Do you offer a free trial?',
        answer:   'Yes — all plans come with a 14-day free trial with no credit card required.',
      },
      {
        question: 'Can I change my plan later?',
        answer:   'Absolutely. You can upgrade, downgrade, or cancel at any time from your account settings.',
      },
      {
        question: 'Is my data secure?',
        answer:   'We take security seriously. Your data is encrypted at rest and in transit, and we are SOC 2 Type II certified.',
      },
      {
        question: 'Do you offer customer support?',
        answer:   'Yes. We offer email support on all plans and live chat on Pro and Enterprise plans.',
      },
    ],
    blockClass: 'bg-[var(--surface-base)]',
    sectionId: 'faq',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    {
      id: 'centered',
      label: 'Centered',
      description: 'Single-column centred list',
      overrides: { layout: 'centered' },
    },
    {
      id: 'two-col',
      label: '2 Columns',
      description: 'FAQs split into two columns',
      overrides: { layout: 'two-col' },
    },
  ],
  defaultVariant: 'centered',
  Component: FaqAccordionBlock,
})

export default FaqAccordionBlock
