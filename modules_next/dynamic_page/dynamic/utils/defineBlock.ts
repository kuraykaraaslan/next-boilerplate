import type { ComponentType } from 'react'
import type { BlockDefinition, BlockVariant, FieldSchema } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

interface DefineBlockConfig<T extends Record<string, unknown>> {
  type: string
  label: string
  description: string
  category: string
  icon?: string
  tags?: string[]
  skeletonHeight?: number
  schema: Record<string, FieldSchema>
  defaultProps: T
  variants?: BlockVariant[]
  defaultVariant?: string
  Component: AnyComponent
}

/**
 * Type-safe block factory.
 *
 * - Ensures schema keys align with defaultProps keys at the call site.
 * - In development, warns if a schema key has no defaultProps entry.
 * - Returns a fully-typed BlockDefinition ready for BlockRegistry.
 */
export function defineBlock<T extends Record<string, unknown>>(
  config: DefineBlockConfig<T>,
): BlockDefinition {
  if (process.env.NODE_ENV === 'development') {
    for (const key of Object.keys(config.schema)) {
      if (!(key in config.defaultProps)) {
        console.warn(
          `[defineBlock] "${config.type}": schema key "${key}" has no entry in defaultProps.`,
        )
      }
    }
  }

  return {
    type: config.type,
    label: config.label,
    description: config.description,
    category: config.category,
    icon: config.icon,
    tags: config.tags,
    skeletonHeight: config.skeletonHeight,
    defaultProps: config.defaultProps as Record<string, unknown>,
    schema: config.schema as Record<string, FieldSchema>,
    Component: config.Component as ComponentType<Record<string, unknown>>,
    variants: config.variants,
    defaultVariant: config.defaultVariant,
  }
}
