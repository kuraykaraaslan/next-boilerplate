'use client'
import type React from 'react'
import { useEffect, useRef } from 'react'
import BlockBackground from './BlockBackground'
import { parseBgProps, BG_DEFAULT_PROPS, BG_SCHEMA_FIELDS } from '../utils/BlockBg'
import type { BgProps } from '../utils/BlockBg'
import type { FieldSchema } from '../types'

// Structured spacing tokens → Tailwind classes
const PADDING_Y_MAP: Record<string, string> = {
  none: 'py-0',
  sm:   'py-8',
  md:   'py-16',
  lg:   'py-24',
  xl:   'py-32',
}

const PADDING_X_MAP: Record<string, string> = {
  none:      'px-0',
  sm:        'px-4',
  md:        'px-8',
  lg:        'px-12',
  xl:        'px-20',
  container: 'px-6 md:px-12 lg:px-20',
}

const MAX_WIDTH_MAP: Record<string, string> = {
  full:    'max-w-full',
  xl:      'max-w-5xl mx-auto',
  '2xl':   'max-w-7xl mx-auto',
  content: 'max-w-6xl mx-auto',
  narrow:  'max-w-3xl mx-auto',
}

export interface BaseBlockConfig {
  bgProps: BgProps
  sectionId: string
  blockHeight: number
  blockClass: string
  paddingY: string
  paddingX: string
  maxWidth: string
  animation: string
}

interface BaseBlockProps extends BaseBlockConfig {
  style?: React.CSSProperties
  as?: 'section' | 'div'
  children: React.ReactNode
}

export const BASE_BLOCK_DEFAULT_PROPS: Record<string, unknown> = {
  blockClass: '',
  blockHeight: 0,
  sectionId: '',
  animation: 'none',
  // 'none' keeps backwards compat for existing blocks that manage their own inner padding
  paddingY: 'none',
  paddingX: 'container',
  maxWidth: 'content',
  ...BG_DEFAULT_PROPS,
}

export const BASE_BLOCK_SCHEMA_FIELDS: Record<string, FieldSchema> = {
  paddingY: {
    label: 'Vertical Padding',
    type: 'select',
    options: ['none', 'sm', 'md', 'lg', 'xl'],
    value: 'md',
    group: 'Layout',
  },
  paddingX: {
    label: 'Horizontal Padding',
    type: 'select',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small (px-4)', value: 'sm' },
      { label: 'Medium (px-8)', value: 'md' },
      { label: 'Large (px-12)', value: 'lg' },
      { label: 'Extra Large (px-20)', value: 'xl' },
      { label: 'Container (responsive)', value: 'container' },
    ],
    value: 'container',
    group: 'Layout',
  },
  maxWidth: {
    label: 'Content Max Width',
    type: 'select',
    options: [
      { label: 'Full width', value: 'full' },
      { label: 'Narrow (max-w-3xl)', value: 'narrow' },
      { label: 'Content (max-w-6xl)', value: 'content' },
      { label: 'Wide (max-w-7xl)', value: '2xl' },
      { label: 'Extra wide (max-w-5xl)', value: 'xl' },
    ],
    value: 'content',
    group: 'Layout',
  },
  animation: {
    label: 'Scroll Animation', type: 'select', group: 'Layout',
    options: [
      { label: 'None',         value: 'none' },
      { label: 'Fade in',      value: 'fade-in' },
      { label: 'Slide up',     value: 'slide-up' },
      { label: 'Slide down',   value: 'slide-down' },
      { label: 'Slide left',   value: 'slide-left' },
      { label: 'Slide right',  value: 'slide-right' },
      { label: 'Zoom in',      value: 'zoom-in' },
    ],
    value: 'none',
  },
  blockHeight: { label: 'Min Height (px)', type: 'number', value: 0, group: 'Layout' },
  sectionId:   { label: 'Section ID (anchor)', type: 'text', placeholder: 'e.g. contact', group: 'Layout' },
  blockClass:  { label: 'Extra CSS Classes', type: 'text', placeholder: 'e.g. bg-gray-50', group: 'Layout' },
  ...BG_SCHEMA_FIELDS,
}

export function parseBaseBlockProps(raw: Record<string, unknown>): BaseBlockConfig {
  const paddingY = (raw.paddingY as string) || 'none'
  const paddingX = (raw.paddingX as string) || 'container'
  const maxWidth  = (raw.maxWidth  as string) || 'content'
  return {
    bgProps:     parseBgProps(raw),
    sectionId:   (raw.sectionId  as string) || '',
    blockHeight: Number(raw.blockHeight) || 0,
    blockClass:  (raw.blockClass as string) || '',
    animation:   (raw.animation  as string) || 'none',
    paddingY,
    paddingX,
    maxWidth,
  }
}

/**
 * Returns the combined content-wrapper class string (px + max-width) for blocks
 * that opt into structured layout. Use as className on your inner content div.
 */
export function getBlockContentClass(config: Pick<BaseBlockConfig, 'paddingX' | 'maxWidth'>): string {
  const px = PADDING_X_MAP[config.paddingX] ?? PADDING_X_MAP.container
  const mw = MAX_WIDTH_MAP[config.maxWidth] ?? MAX_WIDTH_MAP.content
  return `${px} ${mw}`.trim()
}

export default function BaseBlock({
  bgProps,
  sectionId,
  blockHeight,
  blockClass,
  paddingY,
  animation,
  style,
  as: Tag = 'section',
  children,
}: BaseBlockProps) {
  const animRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animation || animation === 'none') return
    const el = animRef.current
    if (!el) return

    el.classList.add('dp-anim-ready', `dp-anim-${animation}`)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('dp-animated')
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [animation])

  const heightStyle: React.CSSProperties = blockHeight > 0
    ? { height: blockHeight, minHeight: 200, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
    : {}

  // Only apply pyClass when explicitly set (not 'none') to keep compat with blocks
  // that manage vertical spacing via their own inner content div.
  const pyClass = paddingY !== 'none' ? (PADDING_Y_MAP[paddingY] ?? '') : ''

  return (
    <Tag
      className={`relative isolate overflow-hidden ${pyClass} ${blockClass}`.trim()}
      id={sectionId || undefined}
      style={{ ...style, ...heightStyle }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <BlockBackground {...bgProps} />
      </div>
      <div ref={animRef} className="relative z-10">
        {children}
      </div>
    </Tag>
  )
}
