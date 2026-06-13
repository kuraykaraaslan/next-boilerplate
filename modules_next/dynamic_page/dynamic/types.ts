import type { ComponentType } from 'react'

export type { BlockData, DynamicPageBlockRecord } from '@/modules/dynamic_page/dynamic_page.types'

export type FieldType =
  | 'text' | 'url' | 'textarea' | 'color' | 'boolean' | 'number'
  | 'select' | 'multi-select' | 'json' | 'img' | 'repeater'
  | 'icon' | 'rich-text' | 'datetime'
  | 'link' | 'color-token'

export type FieldOption = string | { label: string; value: string }

// Breakpoint-aware responsive prop: scalar OR per-device object
export type ResponsiveValue<T = unknown> = T | { mobile?: T; tablet?: T; desktop?: T }

// Value type for 'link' compound field
export interface LinkValue {
  label: string
  href: string
  target: '_self' | '_blank'
}

export interface FieldSchema {
  label: string
  type: FieldType
  value?: unknown
  options?: FieldOption[]
  placeholder?: string
  uploadFolder?: string
  accept?: string
  description?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
  showIf?: Record<string, unknown | unknown[]>
  group?: string
  fields?: Record<string, FieldSchema>
  // When true, PropFieldRenderer shows M/T/D breakpoint tabs
  responsive?: boolean
}

// A named layout preset for a block
export interface BlockVariant {
  id: string
  label: string
  description?: string
  // thumbnail is a relative /public path or base64 data URL
  thumbnail?: string
  // props to merge over defaultProps when this variant is selected
  overrides: Partial<Record<string, unknown>>
}

export interface BlockDefinition {
  type: string
  label: string
  description: string
  category: string
  icon?: string
  tags?: string[]
  skeletonHeight?: number
  defaultProps: Record<string, unknown>
  schema: Record<string, FieldSchema>
  Component: ComponentType<Record<string, unknown>>
  // Optional named layout presets shown in PropsPanel
  variants?: BlockVariant[]
  defaultVariant?: string
}

