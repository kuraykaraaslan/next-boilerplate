import type { ResponsiveValue } from '../types'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

function isResponsiveObject<T>(v: unknown): v is { mobile?: T; tablet?: T; desktop?: T } {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false
  const keys = Object.keys(v as object)
  return keys.some((k) => k === 'mobile' || k === 'tablet' || k === 'desktop')
}

/**
 * Reads the value for the active breakpoint.
 * Fallback chain: desktop → tablet → mobile → raw scalar.
 */
export function resolveResponsiveProp<T>(
  value: ResponsiveValue<T>,
  breakpoint: Breakpoint,
): T | undefined {
  if (!isResponsiveObject<T>(value)) return value as T | undefined

  if (breakpoint === 'mobile') {
    return value.mobile ?? value.tablet ?? value.desktop
  }
  if (breakpoint === 'tablet') {
    return value.tablet ?? value.desktop ?? value.mobile
  }
  return value.desktop ?? value.tablet ?? value.mobile
}

/**
 * Returns a new ResponsiveValue with the given breakpoint set.
 * Keeps other breakpoints unchanged.
 */
export function setResponsiveProp<T>(
  current: ResponsiveValue<T>,
  breakpoint: Breakpoint,
  newValue: T,
): ResponsiveValue<T> {
  if (isResponsiveObject<T>(current)) {
    return { ...current, [breakpoint]: newValue }
  }
  // Promote scalar to responsive object, copying scalar to all breakpoints first
  const scalar = current as T | undefined
  const base = { mobile: scalar, tablet: scalar, desktop: scalar }
  return { ...base, [breakpoint]: newValue }
}

/**
 * Returns the per-breakpoint value if set, else undefined (for controlled inputs).
 */
export function getBreakpointValue<T>(
  value: ResponsiveValue<T>,
  breakpoint: Breakpoint,
): T | undefined {
  if (!isResponsiveObject<T>(value)) return value as T | undefined
  return value[breakpoint]
}
