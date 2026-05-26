'use client'
import type React from 'react'
import BlockBackground from './BlockBackground'
import { parseBgProps, BG_DEFAULT_PROPS, BG_SCHEMA_FIELDS } from '../utils/BlockBg'
import type { BgProps } from '../utils/BlockBg'
import type { FieldSchema } from '../types'

export interface BaseBlockConfig {
  bgProps: BgProps
  sectionId: string
  blockHeight: number
  blockClass: string
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
  ...BG_DEFAULT_PROPS,
}

export const BASE_BLOCK_SCHEMA_FIELDS: Record<string, FieldSchema> = {
  blockClass: { label: 'Section Classes (Tailwind)', type: 'text', placeholder: 'pt-16' },
  sectionId:  { label: 'Section ID (anchor)',         type: 'text', placeholder: 'e.g. contact' },
  blockHeight: { label: 'Min Height (px)',             type: 'number', value: 0 },
  ...BG_SCHEMA_FIELDS,
}

export function parseBaseBlockProps(raw: Record<string, unknown>): BaseBlockConfig {
  return {
    bgProps:     parseBgProps(raw),
    sectionId:   (raw.sectionId   as string) || '',
    blockHeight: Number(raw.blockHeight)     || 0,
    blockClass:  (raw.blockClass  as string) || '',
  }
}

export default function BaseBlock({
  bgProps,
  sectionId,
  blockHeight,
  blockClass,
  style,
  as: Tag = 'section',
  children,
}: BaseBlockProps) {
  const heightStyle: React.CSSProperties = blockHeight > 0
    ? { height: blockHeight, minHeight: 200, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
    : {}

  return (
    <Tag
      className={`relative isolate overflow-hidden ${blockClass}`.trim()}
      id={sectionId || undefined}
      style={{ ...style, ...heightStyle }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <BlockBackground {...bgProps} />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </Tag>
  )
}
