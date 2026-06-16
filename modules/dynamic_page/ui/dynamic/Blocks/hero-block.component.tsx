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

interface HeroProps extends Record<string, unknown> {
  variant?: string
  tagline?: string
  title: string
  titleAccent?: string
  subtitle?: string
  cta?: LinkValue
  // secondary CTA (variant: split uses it)
  ctaSecondary?: LinkValue
  // split-image variant
  image?: string
}

function HeroBlock(rawProps: HeroProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)
  const variant      = rawProps.variant || 'centered'

  const tagline      = rawProps.tagline
  const title        = rawProps.title || 'Your Title'
  const titleAccent  = rawProps.titleAccent
  const subtitle     = rawProps.subtitle
  const cta          = rawProps.cta as LinkValue | undefined
  const ctaSecondary = rawProps.ctaSecondary as LinkValue | undefined
  const image        = rawProps.image as string | undefined

  const taglineEl = tagline ? (
    <p className="text-sm font-semibold mb-4 text-[var(--primary)] uppercase tracking-wider">{tagline}</p>
  ) : null

  const titleEl = (
    <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight text-[var(--text-primary)]">
      {title}
      {titleAccent && (
        <>
          <br />
          <span className="text-[var(--primary)]">{titleAccent}</span>
        </>
      )}
    </h1>
  )

  const subtitleEl = subtitle ? (
    <p className="text-lg md:text-xl mb-10 text-[var(--text-secondary)]">{subtitle}</p>
  ) : null

  const ctaEl = cta?.label ? (
    <Link
      href={cta.href || '#'}
      target={cta.target}
      className="inline-block px-8 py-3.5 text-base font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 hover:scale-[1.03] transition-all"
    >
      {cta.label}
    </Link>
  ) : null

  const ctaSecEl = ctaSecondary?.label ? (
    <Link
      href={ctaSecondary.href || '#'}
      target={ctaSecondary.target}
      className="inline-block px-8 py-3.5 text-base font-semibold rounded-lg border border-[var(--text-primary)]/20 text-[var(--text-primary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
    >
      {ctaSecondary.label}
    </Link>
  ) : null

  // ── Variant: centered ─────────────────────────────────────────────────────────
  if (variant === 'centered') {
    return (
      <BaseBlock {...baseProps}>
        <div className={`${contentClass} py-20 text-center`}>
          {taglineEl}
          {titleEl}
          {subtitleEl}
          {(ctaEl || ctaSecEl) && (
            <div className="flex items-center justify-center flex-wrap gap-4">
              {ctaEl}
              {ctaSecEl}
            </div>
          )}
        </div>
      </BaseBlock>
    )
  }

  // ── Variant: left-aligned ────────────────────────────────────────────────────
  if (variant === 'left') {
    return (
      <BaseBlock {...baseProps}>
        <div className={`${contentClass} py-20`}>
          <div className="max-w-2xl">
            {taglineEl}
            {titleEl}
            {subtitleEl}
            {(ctaEl || ctaSecEl) && (
              <div className="flex items-center flex-wrap gap-4">
                {ctaEl}
                {ctaSecEl}
              </div>
            )}
          </div>
        </div>
      </BaseBlock>
    )
  }

  // ── Variant: split (text + image) ─────────────────────────────────────────────
  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-16`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            {taglineEl}
            {titleEl}
            {subtitleEl}
            {(ctaEl || ctaSecEl) && (
              <div className="flex items-center flex-wrap gap-4">
                {ctaEl}
                {ctaSecEl}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="w-full max-h-96 object-cover rounded-2xl shadow-xl"
              />
            ) : (
              <div className="w-full h-64 rounded-2xl bg-[var(--surface-overlay)] flex items-center justify-center text-[var(--text-primary)]/20 text-sm">
                Add an image
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseBlock>
  )
}

export const HeroBlockDefinition = defineBlock<HeroProps>({
  type: 'HeroBlock',
  label: 'Hero',
  category: 'Hero',
  description: 'Page hero with title, subtitle, and CTA buttons. Choose between centered, left-aligned, or split-image layouts.',
  schema: {
    tagline:      { label: 'Tagline (above title)',        type: 'text',     placeholder: 'Small label above title', group: 'Content' },
    title:        { label: 'Title',                        type: 'text',     placeholder: 'Your headline', group: 'Content' },
    titleAccent:  { label: 'Title Accent (coloured line)', type: 'text',     placeholder: 'Accented part', group: 'Content' },
    subtitle:     { label: 'Subtitle',                     type: 'textarea', placeholder: 'Supporting copy…', group: 'Content' },
    cta:          { label: 'Primary Button',               type: 'link',     group: 'Content' },
    ctaSecondary: { label: 'Secondary Button',             type: 'link',     group: 'Content' },
    image:        { label: 'Image (split variant)',        type: 'img',      uploadFolder: 'hero', group: 'Content', showIf: { variant: 'split' } },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    variant: 'centered',
    tagline: '',
    title: 'Tools Built for',
    titleAccent: 'the Modern Developer',
    subtitle: 'Explore our full suite of tools — designed to automate, accelerate, and elevate every stage of your project.',
    cta: { label: 'Get Started', href: '/contact', target: '_self' },
    ctaSecondary: { label: '', href: '', target: '_self' },
    image: '',
    blockClass: 'bg-[var(--surface-base)]',
    sectionId: 'hero',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    {
      id: 'centered',
      label: 'Centered',
      description: 'All content centred on the page',
      overrides: { variant: 'centered' },
    },
    {
      id: 'left',
      label: 'Left',
      description: 'Content aligned to the left',
      overrides: { variant: 'left' },
    },
    {
      id: 'split',
      label: 'Split',
      description: 'Text on the left, image on the right',
      overrides: { variant: 'split' },
    },
  ],
  defaultVariant: 'centered',
  Component: HeroBlock,
})

export default HeroBlock
