import { z } from 'zod'

// ============================================================================
// Menu
// ============================================================================

export const NavigationMenuSchema = z.object({
  menuId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  location: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type NavigationMenu = z.infer<typeof NavigationMenuSchema>

export const SafeNavigationMenuSchema = NavigationMenuSchema.omit({ deletedAt: true })
export type SafeNavigationMenu = z.infer<typeof SafeNavigationMenuSchema>

// ============================================================================
// Item
// ============================================================================

export const NavigationItemSchema = z.object({
  itemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  menuId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  label: z.string(),
  url: z.string(),
  order: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type NavigationItem = z.infer<typeof NavigationItemSchema>

export const SafeNavigationItemSchema = NavigationItemSchema.omit({ deletedAt: true })
export type SafeNavigationItem = z.infer<typeof SafeNavigationItemSchema>
