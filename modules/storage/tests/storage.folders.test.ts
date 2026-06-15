import { describe, it, expect } from 'vitest'
import {
  isValidStorageFolder,
  registerStorageFolder,
  listStorageFolders,
  BASE_STORAGE_FOLDERS,
} from '../storage.folders'

describe('storage folder registry', () => {
  it('accepts the base (core) folders', () => {
    for (const f of BASE_STORAGE_FOLDERS) expect(isValidStorageFolder(f)).toBe(true)
  })

  it('rejects an unregistered folder', () => {
    expect(isValidStorageFolder('legal-docs')).toBe(false)
  })

  it('accepts a folder once a module registers it', () => {
    registerStorageFolder('legal-docs')
    expect(isValidStorageFolder('legal-docs')).toBe(true)
    expect(listStorageFolders()).toContain('legal-docs')
  })

  it('supports nested folders', () => {
    registerStorageFolder('medical/records')
    expect(isValidStorageFolder('medical/records')).toBe(true)
  })

  it('rejects malformed names and throws on registering them', () => {
    expect(isValidStorageFolder('../etc')).toBe(false)
    expect(isValidStorageFolder('UPPER')).toBe(false)
    expect(() => registerStorageFolder('bad name!')).toThrow(/Invalid storage folder/i)
  })
})
