'use client'

import { useState } from 'react'
import Link from 'next/link'
import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
} from '../partials/base-block.component'
import { defineBlock } from '../utils/defineBlock'
import type { LinkValue } from '../types'

interface BannerProps extends Record<string, unknown> {
  message?: string
  icon?: string
  cta?: LinkValue
  dismissible?: boolean
  align?: string
}

function BannerBlock(rawProps: BannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const baseProps    = parseBaseBlockProps(rawProps)
  const message      = rawProps.message    || ''
  const icon         = rawProps.icon       || ''
  const cta          = rawProps.cta        as LinkValue | undefined
  const dismissible  = Boolean(rawProps.dismissible)
  const align        = rawProps.align      || 'center'

  if (dismissed) return null

  const alignClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'

  return (
    <BaseBlock {...baseProps}>
      <div className={`relative flex items-center flex-wrap gap-3 px-4 py-3 ${alignClass}`}>
        {icon && <span className="text-base leading-none">{icon}</span>}
        {message && <span className="text-sm font-medium">{message}</span>}
        {cta?.label && (
          <Link
            href={cta.href || '#'}
            target={cta.target}
            className="text-sm font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap"
          >
            {cta.label} →
          </Link>
        )}
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-white/20 transition-all text-base leading-none"
          >
            ×
          </button>
        )}
      </div>
    </BaseBlock>
  )
}

export const BannerBlockDefinition = defineBlock<BannerProps>({
  type: 'BannerBlock',
  label: 'Banner',
  category: 'Content',
  description: 'Slim announcement bar — promotions, alerts, or important notices.',
  schema: {
    message:     { label: 'Message',     type: 'text',    placeholder: '🎉 Summer sale — 20% off all plans!', group: 'Content' },
    icon:        { label: 'Icon / Emoji', type: 'text',   placeholder: '🎉', group: 'Content' },
    cta:         { label: 'Link',         type: 'link',   group: 'Content' },
    dismissible: { label: 'Dismissible', type: 'boolean', value: false, group: 'Content' },
    align: {
      label: 'Alignment', type: 'select', group: 'Layout',
      options: [{ label: 'Center', value: 'center' }, { label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }],
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    message: 'New feature just launched — check it out!',
    icon: '🎉',
    cta: { label: 'Learn more', href: '#', target: '_self' },
    dismissible: true,
    align: 'center',
    blockClass: 'bg-[var(--primary)] text-white',
    sectionId: '',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    { id: 'primary', label: 'Primary', description: 'Brand colour background', overrides: { blockClass: 'bg-[var(--primary)] text-white' } },
    { id: 'dark',    label: 'Dark',    description: 'Dark background', overrides: { blockClass: 'bg-[var(--surface-overlay)] text-[var(--text-primary)]' } },
    { id: 'warning', label: 'Warning', description: 'Amber/warning tone', overrides: { blockClass: 'bg-amber-400 text-amber-950' } },
    { id: 'info',    label: 'Info',    description: 'Light info background', overrides: { blockClass: 'bg-blue-50 text-blue-900 border-b border-blue-200' } },
    { id: 'success', label: 'Success', description: 'Green success tone', overrides: { blockClass: 'bg-emerald-500 text-white' } },
  ],
  defaultVariant: 'primary',
  Component: BannerBlock,
})

export default BannerBlock
