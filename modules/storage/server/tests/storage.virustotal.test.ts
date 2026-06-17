import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import VirusTotalScanner from '../scanners/virustotal.scanner'

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response

const scanner = new VirusTotalScanner('test-key')
const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

beforeEach(() => {
  vi.restoreAllMocks()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('VirusTotalScanner', () => {
  it('reports infected when engines flag the file', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(ok({ data: { id: 'analysis-1' } }))
      .mockResolvedValueOnce(ok({ data: { attributes: { status: 'completed', stats: { malicious: 3, suspicious: 1 } } } })))

    const res = await scanner.scan(bytes, { filename: 'f.png', timeoutMs: 5000 })
    expect(res.status).toBe('infected')
    expect(res.provider).toBe('virustotal')
  })

  it('reports clean when no engine flags the file', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(ok({ data: { id: 'analysis-2' } }))
      .mockResolvedValueOnce(ok({ data: { attributes: { status: 'completed', stats: { malicious: 0, suspicious: 0 } } } })))

    const res = await scanner.scan(bytes, { filename: 'f.png', timeoutMs: 5000 })
    expect(res.status).toBe('clean')
  })

  it('reports error when the upload call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(fail(429)))
    const res = await scanner.scan(bytes, { filename: 'f.png', timeoutMs: 5000 })
    expect(res.status).toBe('error')
  })

  it('reports error when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const res = await scanner.scan(bytes, { filename: 'f.png', timeoutMs: 5000 })
    expect(res.status).toBe('error')
  })
})
