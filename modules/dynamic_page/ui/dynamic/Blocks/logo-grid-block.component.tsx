'use client'

import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/base-block.component'
import { defineBlock } from '../utils/defineBlock'

interface LogoItem { name?: string; url?: string; href?: string }

interface LogoGridProps extends Record<string, unknown> {
  heading?: string
  layout?: string
  logoHeight?: string
  speed?: string
  logos?: LogoItem[]
}

const HEIGHT_MAP: Record<string, string> = {
  sm: 'max-h-6',
  md: 'max-h-10',
  lg: 'max-h-14',
}

function LogoItem({ logo, heightClass, i }: { logo: LogoItem; heightClass: string; i: number }) {
  const inner = logo.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.url}
      alt={logo.name || `Logo ${i + 1}`}
      className={`${heightClass} max-w-[140px] w-auto object-contain`}
    />
  ) : (
    <span className="text-sm font-semibold text-[var(--text-secondary)] px-3">{logo.name || `Brand ${i + 1}`}</span>
  )

  const cls = 'flex items-center justify-center p-3 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300'

  return logo.href ? (
    <a href={logo.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

function LogoGridBlock(rawProps: LogoGridProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)
  const heading    = rawProps.heading    || ''
  const layout     = (rawProps.layout as string)     || 'grid'
  const logoHeight = (rawProps.logoHeight as string) || 'md'
  const speed      = (rawProps.speed as string)      || 'normal'
  const logos      = (rawProps.logos as LogoItem[] | undefined) || []

  const heightClass = HEIGHT_MAP[logoHeight] ?? HEIGHT_MAP.md
  const speedMap: Record<string, string> = { slow: '40s', normal: '25s', fast: '15s' }
  const duration = speedMap[speed] ?? speedMap.normal

  const headingEl = heading ? (
    <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-10">
      {heading}
    </p>
  ) : null

  if (layout === 'marquee') {
    // Duplicate logos for seamless loop
    const items = [...logos, ...logos]
    return (
      <BaseBlock {...baseProps}>
        <div className={`${contentClass} py-14`}>
          {headingEl}
          <div className="overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="dp-marquee flex gap-12 w-max" style={{ animationDuration: duration }}>
              {items.map((logo, i) => (
                <div key={i} className="flex-shrink-0">
                  <LogoItem logo={logo} heightClass={heightClass} i={i % logos.length} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </BaseBlock>
    )
  }

  // Grid layout
  const colClass = logos.length <= 3
    ? 'grid-cols-3'
    : logos.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : logos.length === 5
        ? 'grid-cols-3 sm:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'

  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-14`}>
        {headingEl}
        <div className={`grid ${colClass} gap-2`}>
          {logos.map((logo, i) => (
            <LogoItem key={i} logo={logo} heightClass={heightClass} i={i} />
          ))}
        </div>
      </div>
    </BaseBlock>
  )
}

export const LogoGridBlockDefinition = defineBlock<LogoGridProps>({
  type: 'LogoGridBlock',
  label: 'Logo Grid',
  category: 'Content',
  description: 'Partner, client, or integration logos in a responsive grid or scrolling marquee.',
  schema: {
    heading: { label: 'Label above logos', type: 'text', placeholder: 'Trusted by leading teams', group: 'Content' },
    layout: {
      label: 'Layout', type: 'select', group: 'Layout',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Marquee (auto-scroll)', value: 'marquee' },
      ],
    },
    logoHeight: {
      label: 'Logo Height', type: 'select', group: 'Layout',
      options: [
        { label: 'Small (24px)',  value: 'sm' },
        { label: 'Medium (40px)', value: 'md' },
        { label: 'Large (56px)',  value: 'lg' },
      ],
    },
    speed: {
      label: 'Marquee Speed', type: 'select', group: 'Layout',
      showIf: { layout: 'marquee' },
      options: [
        { label: 'Slow',   value: 'slow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Fast',   value: 'fast' },
      ],
    },
    logos: {
      label: 'Logos', type: 'repeater', group: 'Content',
      fields: {
        name: { label: 'Brand name (fallback)', type: 'text', placeholder: 'Acme' },
        url:  { label: 'Logo image URL',        type: 'img',  uploadFolder: 'logos' },
        href: { label: 'Link (optional)',        type: 'url',  placeholder: 'https://acme.com' },
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading: 'Trusted by 500+ companies worldwide',
    layout: 'grid',
    logoHeight: 'md',
    speed: 'normal',
    logos: [
      { name: 'Acme',     url: '', href: '' },
      { name: 'Globex',   url: '', href: '' },
      { name: 'Initech',  url: '', href: '' },
      { name: 'Umbrella', url: '', href: '' },
      { name: 'Hooli',    url: '', href: '' },
      { name: 'Aviato',   url: '', href: '' },
    ],
    blockClass: 'bg-[var(--surface-raised)]',
    sectionId: '',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    { id: 'grid',    label: 'Grid',    description: 'Responsive grid layout', overrides: { layout: 'grid' } },
    { id: 'marquee', label: 'Marquee', description: 'Auto-scrolling ticker',  overrides: { layout: 'marquee' } },
  ],
  defaultVariant: 'grid',
  Component: LogoGridBlock,
})

export default LogoGridBlock
