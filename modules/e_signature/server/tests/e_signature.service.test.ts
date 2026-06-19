import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// e-signature providers are now SANDBOXED community plugins resolved per-tenant via
// the common external-contributions bridge. These tests mock that bridge so the
// service resolves an `IsolatedESignatureProvider` whose ops we drive through a
// controllable `invoke` — no built-in satellite code.
vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    EID_DEFAULT_PROVIDER: 'mobil_imza_aggregator',
    EID_PROVIDER_MAP: undefined,
    EID_REQUIRED_LOA: undefined,
    APPLICATION_NAME: 'TestApp',
  },
}));

const redisStore = new Map<string, string>();
vi.mock('@kuraykaraaslan/redis', () => ({
  default: {
    scanStream: vi.fn(async () => undefined),
    get: vi.fn(async (k: string) => redisStore.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => { redisStore.set(k, v); return 'OK'; }),
    setex: vi.fn(async (k: string, _ttl: number, v: string) => { redisStore.set(k, v); return 'OK'; }),
    del: vi.fn(async (k: string) => { redisStore.delete(k); return 1; }),
    ping: vi.fn(async () => 'PONG'),
    mget: vi.fn(async () => []),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
    incr: vi.fn(async () => 1),
  },
  jitter: (n: number) => n,
  singleFlight: async <T,>(_k: string, fn: () => Promise<T>) => fn(),
}));

vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@kuraykaraaslan/db', () => ({ getDataSource: vi.fn(), tenantDataSourceFor: vi.fn() }));

// The community bridge: a single installed @esign/mobil_imza plugin for the tenant.
// Hoisted so the (hoisted) vi.mock factory can reference it without a TDZ error.
const { invokeMock, listExternalContributions } = vi.hoisted(() => {
  const invokeMock = vi.fn();
  const listExternalContributions = vi.fn(async (tenantId: string, point: string) => {
    if (!tenantId || point !== 'esign:provider') return [];
    return [{
      key: 'mobil_imza_aggregator',
      configured: true,
      metadata: {
        label: 'Mobil İmza', displayName: 'Mobil İmza', countries: ['TR'],
        capabilities: ['login'], loa: 'high', identifierLabel: 'Mobile number (Turkey)',
        identifierPlaceholder: '+90 5XX XXX XX XX',
      },
      invoke: invokeMock,
    }];
  });
  return { invokeMock, listExternalContributions };
});
vi.mock('@kuraykaraaslan/common/server/external-extensions', () => ({ listExternalContributions }));

import ESignatureService from '../e_signature.service';

const TENANT = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  redisStore.clear();
  invokeMock.mockReset();
});

describe('ESignatureService.resolveProvider', () => {
  it('resolves the country-mapped community provider for a tenant', async () => {
    const p = await ESignatureService.resolveProvider({ country: 'TR', tenantId: TENANT });
    expect(p.name).toBe('mobil_imza_aggregator');
  });

  it('honours an explicit providerOverride', async () => {
    const p = await ESignatureService.resolveProvider({ providerOverride: 'mobil_imza_aggregator', tenantId: TENANT });
    expect(p.name).toBe('mobil_imza_aggregator');
  });

  it('throws when no plugin is installed for the country', async () => {
    await expect(ESignatureService.resolveProvider({ country: 'GB', tenantId: TENANT })).rejects.toThrowError(/No e-signature provider/i);
  });

  it('throws without a tenant (no community provider can be resolved)', async () => {
    await expect(ESignatureService.resolveProvider({ country: 'TR' })).rejects.toThrowError(/No e-signature provider/i);
  });
});

describe('ESignatureService.listCountryHints', () => {
  it('groups installed providers by country with hint metadata from the manifest', async () => {
    const hints = await ESignatureService.listCountryHints({ tenantId: TENANT });
    expect(hints).toHaveLength(1);
    expect(hints[0].country).toBe('TR');
    const p = hints[0].providers[0];
    expect(p.id).toBe('mobil_imza_aggregator');
    expect(p.name).toBe('Mobil İmza');
    expect(p.identifierLabel).toMatch(/Mobile number/);
    expect(p.capabilities).toEqual(['login']);
    expect(p.loa).toBe('high');
  });

  it('returns nothing without a tenant', async () => {
    expect(await ESignatureService.listCountryHints()).toHaveLength(0);
  });
});

describe('ESignatureService.initiateLogin', () => {
  it('forwards to the sandboxed provider and writes a single-use transaction record', async () => {
    invokeMock.mockResolvedValue({ providerTxnId: 'PROV-1', displayCode: '1234' });

    const result = await ESignatureService.initiateLogin({
      country: 'TR',
      identifier: '+905321234567',
      ip: '1.2.3.4',
      ua: 'jest',
      purpose: 'login',
      tenantId: TENANT,
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [op, input] = invokeMock.mock.calls[0];
    expect(op).toBe('initiateLogin');
    expect(input.identifier).toBe('+905321234567');
    expect(input.challenge).toContain('TestApp:');
    expect(input.country).toBe('TR');

    expect(result.transactionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.displayCode).toBe('1234');
    expect(result.providerName).toBe('mobil_imza_aggregator');
  });
});

describe('ESignatureService.pollStatus — scope + lifecycle', () => {
  it('returns expired when the transactionId does not exist', async () => {
    const out = await ESignatureService.pollStatus({
      transactionId: '00000000-0000-0000-0000-000000000000', ip: '1.2.3.4', ua: 'jest',
    });
    expect(out.status).toBe('expired');
  });

  it('rejects polls from a different IP/UA (session fixation guard)', async () => {
    invokeMock.mockResolvedValue({ providerTxnId: 'PROV-2' });
    const { transactionId } = await ESignatureService.initiateLogin({
      country: 'TR', identifier: '+905321234567', ip: '1.2.3.4', ua: 'first-ua', purpose: 'login', tenantId: TENANT,
    });
    await expect(
      ESignatureService.pollStatus({ transactionId, ip: '9.9.9.9', ua: 'first-ua' }),
    ).rejects.toThrow(/scope/i);
  });

  it('forwards still-pending provider state without consuming the record', async () => {
    invokeMock.mockImplementation(async (op: string) => (op === 'initiateLogin' ? { providerTxnId: 'PROV-3' } : { status: 'pending' }));
    const { transactionId } = await ESignatureService.initiateLogin({
      country: 'TR', identifier: '+905321234567', ip: '1.2.3.4', ua: 'jest', purpose: 'login', tenantId: TENANT,
    });
    const out = await ESignatureService.pollStatus({ transactionId, ip: '1.2.3.4', ua: 'jest' });
    expect(out.status).toBe('pending');
  });

  it('returns failed when the provider reports failed', async () => {
    invokeMock.mockImplementation(async (op: string) =>
      (op === 'initiateLogin' ? { providerTxnId: 'PROV-4' } : { status: 'failed', failureReason: 'user_cancelled' }));
    const { transactionId } = await ESignatureService.initiateLogin({
      country: 'TR', identifier: '+905321234567', ip: '1.2.3.4', ua: 'jest', purpose: 'login', tenantId: TENANT,
    });
    const out = await ESignatureService.pollStatus({ transactionId, ip: '1.2.3.4', ua: 'jest' });
    expect(out.status).toBe('failed');
  });
});
