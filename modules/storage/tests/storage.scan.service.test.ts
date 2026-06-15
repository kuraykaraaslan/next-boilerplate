import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ScanConfig, ScanResult } from '../storage.scan.types'

const { mockProvider, mockScanner, decrementStorageBytes } = vi.hoisted(() => ({
  mockProvider: { uploadFile: vi.fn(async () => ({})), deleteFile: vi.fn(async () => undefined) },
  mockScanner: { scan: vi.fn() },
  decrementStorageBytes: vi.fn(async () => undefined),
}))

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

vi.mock('../storage.provider-factory', () => ({
  getProvider: vi.fn(async () => ({ provider: mockProvider, resolvedName: 'aws-s3' })),
}))

vi.mock('../storage.scanner-factory', () => ({
  createScanner: vi.fn(() => mockScanner),
}))

vi.mock('@/modules/tenant_usage/tenant_usage.service', () => ({
  TenantUsageService: { decrementStorageBytes },
}))

import { scan, handleInfected } from '../storage.scan.service'

const TENANT = '11111111-1111-4111-8111-111111111111'

const config = (over: Partial<ScanConfig> = {}): ScanConfig => ({
  enabled: true,
  mode: 'async',
  provider: 'virustotal',
  apiKey: 'key',
  timeoutMs: 5000,
  infectedAction: 'quarantine',
  quarantineFolder: 'quarantine',
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('scan()', () => {
  it('returns the scanner result', async () => {
    const result: ScanResult = { status: 'clean', provider: 'virustotal' }
    mockScanner.scan.mockResolvedValueOnce(result)
    expect(await scan(config(), new Uint8Array([1, 2, 3]), 'f.png')).toEqual(result)
  })

  it('degrades to error if the scanner throws', async () => {
    mockScanner.scan.mockRejectedValueOnce(new Error('boom'))
    const res = await scan(config(), new Uint8Array([1]), 'f.png')
    expect(res.status).toBe('error')
  })
})

describe('handleInfected()', () => {
  const row = { key: `${TENANT}/images/x.png`, mimeType: 'image/png', size: 100 }

  it('quarantine: re-uploads to the quarantine folder then deletes the original', async () => {
    await handleInfected(TENANT, row, new Uint8Array([1, 2]), config({ infectedAction: 'quarantine' }))
    expect(mockProvider.uploadFile).toHaveBeenCalledTimes(1)
    const opts = (mockProvider.uploadFile.mock.calls[0] as any[])[1]
    expect(opts.folder).toBe('quarantine')
    expect(mockProvider.deleteFile).toHaveBeenCalledWith(row.key)
    expect(decrementStorageBytes).not.toHaveBeenCalled() // bytes moved, not removed
  })

  it('delete: removes the object and decrements usage', async () => {
    await handleInfected(TENANT, row, new Uint8Array([1, 2]), config({ infectedAction: 'delete' }))
    expect(mockProvider.uploadFile).not.toHaveBeenCalled()
    expect(mockProvider.deleteFile).toHaveBeenCalledWith(row.key)
    expect(decrementStorageBytes).toHaveBeenCalledWith(TENANT, 100)
  })

  it('quarantine falls back to delete if the re-upload fails', async () => {
    mockProvider.uploadFile.mockRejectedValueOnce(new Error('upload failed'))
    await handleInfected(TENANT, row, new Uint8Array([1, 2]), config({ infectedAction: 'quarantine' }))
    expect(mockProvider.deleteFile).toHaveBeenCalledWith(row.key)
  })
})
