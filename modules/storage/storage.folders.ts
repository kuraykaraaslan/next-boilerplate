import { StorageFolderSchema } from './storage.enums'

// ============================================================================
// Storage folder registry
// ----------------------------------------------------------------------------
// `StorageFolder` (storage.enums.ts) is the set of folders the core ships with.
// Other modules (legal-docs, medical-records, …) must be able to add their own
// upload folder WITHOUT editing the core enum — otherwise every module is
// coupled to the storage module. This registry holds the effective allowlist:
// the base enum values plus anything modules register at init via
// `registerStorageFolder`. `isValidStorageFolder` is the single check the
// providers use instead of `StorageFolderSchema.safeParse`.
// ============================================================================

/** Folder names must be lowercase slug segments, optionally nested with '/'. */
const FOLDER_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\/[a-z0-9]+(?:[-_][a-z0-9]+)*)*$/

/** Folders the core ships with. */
export const BASE_STORAGE_FOLDERS: readonly string[] = StorageFolderSchema.options

const registry = new Set<string>(BASE_STORAGE_FOLDERS)

/**
 * Register one or more custom folders. Idempotent. Names are validated against
 * the slug pattern; an invalid name throws so a module's typo fails loudly at
 * boot rather than silently rejecting uploads later.
 */
export function registerStorageFolder(...names: string[]): void {
  for (const name of names) {
    if (!FOLDER_PATTERN.test(name)) {
      throw new Error(`Invalid storage folder name: "${name}"`)
    }
    registry.add(name)
  }
}

/** True when `folder` is a registered, well-formed folder. */
export function isValidStorageFolder(folder: string): boolean {
  return typeof folder === 'string' && FOLDER_PATTERN.test(folder) && registry.has(folder)
}

/** Snapshot of all currently allowed folders (base + registered). */
export function listStorageFolders(): string[] {
  return [...registry]
}
