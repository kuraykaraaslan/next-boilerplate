'use client'

import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/BaseBlock'
import { defineBlock } from '../utils/defineBlock'

interface Testimonial {
  quote?: string
  name?: string
  role?: string
  company?: string
  avatar?: string
  rating?: number
}

interface TestimonialsProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  columns?: string
  showRating?: boolean
  testimonials?: Testimonial[]
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={`w-4 h-4 ${n <= rating ? 'text-yellow-400' : 'text-[var(--text-primary)]/15'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function TestimonialsBlock(rawProps: TestimonialsProps) {
  const baseProps     = parseBaseBlockProps(rawProps)
  const contentClass  = getBlockContentClass(baseProps)

  const heading      = rawProps.heading      || ''
  const subheading   = rawProps.subheading   || ''
  const columns      = rawProps.columns      || '3'
  const showRating   = rawProps.showRating   !== false
  const testimonials = (rawProps.testimonials as Testimonial[] | undefined) || []

  const colClass: Record<string, string> = {
    '1': 'grid-cols-1 max-w-2xl mx-auto',
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }

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

        <div className={`grid ${colClass[columns] ?? colClass['3']} gap-6`}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 p-6 rounded-2xl bg-[var(--surface-raised)] border border-[var(--text-primary)]/10"
            >
              {showRating && typeof t.rating === 'number' && t.rating > 0 && (
                <StarRating rating={t.rating} />
              )}

              {t.quote && (
                <p className="text-[var(--text-primary)]/80 leading-relaxed text-sm flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-[var(--text-primary)]/10">
                {t.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.avatar}
                    alt={t.name || ''}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0 text-[var(--primary)] text-sm font-semibold">
                    {(t.name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  {t.name && (
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{t.name}</p>
                  )}
                  {(t.role || t.company) && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {[t.role, t.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BaseBlock>
  )
}

export const TestimonialsBlockDefinition = defineBlock<TestimonialsProps>({
  type: 'TestimonialsBlock',
  label: 'Testimonials',
  category: 'Content',
  description: 'Customer testimonials with quote, name, role, and optional star rating.',
  schema: {
    heading:    { label: 'Section Heading',    type: 'text',     placeholder: 'What our customers say', group: 'Content' },
    subheading: { label: 'Section Subheading', type: 'textarea', placeholder: 'Supporting copy…', group: 'Content' },
    showRating: { label: 'Show Star Ratings',  type: 'boolean',  value: true, group: 'Layout' },
    columns: {
      label: 'Columns',
      type: 'select',
      options: [
        { label: '1 Column (focused)', value: '1' },
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
      ],
      group: 'Layout',
    },
    testimonials: {
      label: 'Testimonials',
      type: 'repeater',
      group: 'Content',
      fields: {
        quote:   { label: 'Quote',          type: 'textarea', placeholder: 'What they said…' },
        name:    { label: 'Name',           type: 'text',     placeholder: 'Jane Doe' },
        role:    { label: 'Role',           type: 'text',     placeholder: 'CEO' },
        company: { label: 'Company',        type: 'text',     placeholder: 'Acme Inc.' },
        avatar:  { label: 'Avatar URL',     type: 'img',      uploadFolder: 'avatars' },
        rating:  { label: 'Rating (1–5)',   type: 'number' },
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading:    'Loved by Teams Worldwide',
    subheading: 'Don\'t just take our word for it.',
    columns:    '3',
    showRating: true,
    testimonials: [
      {
        quote:   'This platform changed how our team collaborates. Setup was a breeze and the results are incredible.',
        name:    'Sarah Mitchell',
        role:    'Head of Product',
        company: 'TechCorp',
        avatar:  '',
        rating:  5,
      },
      {
        quote:   'The best investment we\'ve made this year. Our delivery speed has doubled since we switched.',
        name:    'James Okafor',
        role:    'Engineering Lead',
        company: 'BuildFast',
        avatar:  '',
        rating:  5,
      },
      {
        quote:   'Outstanding support and a product that actually does what it promises. Highly recommended.',
        name:    'Priya Sharma',
        role:    'Founder',
        company: 'Launchpad',
        avatar:  '',
        rating:  5,
      },
    ],
    blockClass: 'bg-[var(--surface-base)]',
    sectionId: 'testimonials',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    {
      id: '3-col',
      label: '3 Columns',
      description: 'Three testimonial cards side by side',
      overrides: { columns: '3' },
    },
    {
      id: '2-col',
      label: '2 Columns',
      description: 'Two wider testimonial cards',
      overrides: { columns: '2' },
    },
    {
      id: 'single',
      label: 'Single Featured',
      description: 'One prominent testimonial centred',
      overrides: { columns: '1' },
    },
  ],
  defaultVariant: '3-col',
  Component: TestimonialsBlock,
})

export default TestimonialsBlock
