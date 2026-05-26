import { describe, it, expect, vi, beforeEach } from 'vitest';

// Env must contain real-looking aggregator config so the provider constructor
// initialises axios without throwing.
vi.mock('@/modules/env', () => ({
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
    MOBIL_IMZA_AGGREGATOR_BASE_URL: 'https://aggregator.test',
    MOBIL_IMZA_AGGREGATOR_API_KEY: 'test-key',
    MOBIL_IMZA_AGGREGATOR_CUSTOMER_CODE: 'CUST',
  },
}));

const redisStore = new Map<string, string>();
vi.mock('@/modules/redis', () => ({
  default: {
    scanStream: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
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

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

// We don't want the real provider to make HTTP calls; stub initiateLogin and
// pollLoginResult on the prototype after the module loads.
import ESignatureService from './e_signature.service';
import MobilImzaAggregatorProvider from './providers/mobil_imza_aggregator.provider';

beforeEach(() => {
  redisStore.clear();
  vi.restoreAllMocks();
});

describe('ESignatureService.resolveProvider', () => {
  it('picks the country-mapped provider', () => {
    const p = ESignatureService.resolveProvider({ country: 'TR' });
    expect(p.name).toBe('mobil_imza_aggregator');
  });

  it('honours an explicit providerOverride', () => {
    const p = ESignatureService.resolveProvider({ country: 'TR', providerOverride: 'mobil_imza_aggregator' });
    expect(p.name).toBe('mobil_imza_aggregator');
  });

  it('falls back to the default provider when country has no mapping', () => {
    // GB is not in the default country map → falls back to EID_DEFAULT_PROVIDER
    // (which IS Mobil İmza for the test env), but that provider only supports
    // TR — so the country-support guard must reject the call.
    expect(() => ESignatureService.resolveProvider({ country: 'GB' })).toThrowError(/No e-signature provider/i);
  });

  it('throws for an unknown provider name', () => {
    expect(() => ESignatureService.resolveProvider({ providerOverride: 'does-not-exist' }))
      .toThrowError(/No e-signature provider/i);
  });
});

describe('ESignatureService.listCountryHints', () => {
  it('groups providers by country with full hint metadata', () => {
    const hints = ESignatureService.listCountryHints();
    expect(hints).toHaveLength(1);
    expect(hints[0].country).toBe('TR');
    expect(hints[0].providers).toHaveLength(1);
    const p = hints[0].providers[0];
    expect(p.id).toBe('mobil_imza_aggregator');
    expect(p.name).toBe('Mobil İmza');
    expect(p.identifierLabel).toMatch(/Mobile number/);
    expect(p.capabilities).toEqual(['login']);
    expect(p.loa).toBe('high');
  });
});

describe('ESignatureService.initiateLogin', () => {
  it('writes a single-use transaction record bound to ip+ua and returns transactionId', async () => {
    const initiateSpy = vi
      .spyOn(MobilImzaAggregatorProvider.prototype, 'initiateLogin')
      .mockResolvedValue({ providerTxnId: 'PROV-1', displayCode: '1234' });

    const result = await ESignatureService.initiateLogin({
      country: 'TR',
      identifier: '+90 532 123 45 67',
      ip: '1.2.3.4',
      ua: 'jest',
      purpose: 'login',
    });

    expect(initiateSpy).toHaveBeenCalledTimes(1);
    const callArg = initiateSpy.mock.calls[0][0];
    // Identifier is normalised before being forwarded to the provider
    expect(callArg.identifier).toBe('+905321234567');
    expect(callArg.challenge).toContain('TestApp:');

    expect(result.transactionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.displayCode).toBe('1234');
    expect(result.providerName).toBe('mobil_imza_aggregator');

    // The Redis record is stored exactly once, scoped to this client.
    const keys = Array.from(redisStore.keys()).filter((k) => k.startsWith('e_signature:txn:'));
    expect(keys).toHaveLength(1);
    const record = JSON.parse(redisStore.get(keys[0])!);
    expect(record.ip).toBe('1.2.3.4');
    expect(record.ua).toBe('jest');
    expect(record.providerTxnId).toBe('PROV-1');
    expect(record.purpose).toBe('login');
  });

  it('rejects malformed identifiers without contacting the provider', async () => {
    const initiateSpy = vi
      .spyOn(MobilImzaAggregatorProvider.prototype, 'initiateLogin')
      .mockResolvedValue({ providerTxnId: 'never-called' });

    await expect(
      ESignatureService.initiateLogin({
        country: 'TR',
        identifier: 'not-a-phone',
        ip: '1.2.3.4',
        ua: 'jest',
        purpose: 'login',
      }),
    ).rejects.toThrow();
    expect(initiateSpy).not.toHaveBeenCalled();
  });
});

describe('ESignatureService.pollStatus — scope + lifecycle', () => {
  it('returns expired when the transactionId does not exist', async () => {
    const out = await ESignatureService.pollStatus({
      transactionId: '00000000-0000-0000-0000-000000000000',
      ip: '1.2.3.4',
      ua: 'jest',
    });
    expect(out.status).toBe('expired');
  });

  it('rejects polls from a different IP/UA (session fixation guard)', async () => {
    vi.spyOn(MobilImzaAggregatorProvider.prototype, 'initiateLogin')
      .mockResolvedValue({ providerTxnId: 'PROV-2' });
    const { transactionId } = await ESignatureService.initiateLogin({
      country: 'TR',
      identifier: '+905321234567',
      ip: '1.2.3.4',
      ua: 'first-ua',
      purpose: 'login',
    });

    await expect(
      ESignatureService.pollStatus({
        transactionId,
        ip: '9.9.9.9',         // different client
        ua: 'first-ua',
      }),
    ).rejects.toThrow(/scope/i);
  });

  it('forwards still-pending provider state without consuming the record', async () => {
    vi.spyOn(MobilImzaAggregatorProvider.prototype, 'initiateLogin')
      .mockResolvedValue({ providerTxnId: 'PROV-3' });
    vi.spyOn(MobilImzaAggregatorProvider.prototype, 'pollLoginResult')
      .mockResolvedValue({ status: 'pending' });

    const { transactionId } = await ESignatureService.initiateLogin({
      country: 'TR',
      identifier: '+905321234567',
      ip: '1.2.3.4',
      ua: 'jest',
      purpose: 'login',
    });

    const out = await ESignatureService.pollStatus({ transactionId, ip: '1.2.3.4', ua: 'jest' });
    expect(out.status).toBe('pending');

    // Record is still there for the next poll.
    const keys = Array.from(redisStore.keys()).filter((k) => k.includes(transactionId));
    expect(keys).toHaveLength(1);
  });

  it('deletes the Redis record when the provider reports failed', async () => {
    vi.spyOn(MobilImzaAggregatorProvider.prototype, 'initiateLogin')
      .mockResolvedValue({ providerTxnId: 'PROV-4' });
    vi.spyOn(MobilImzaAggregatorProvider.prototype, 'pollLoginResult')
      .mockResolvedValue({ status: 'failed', failureReason: 'user_cancelled' });

    const { transactionId } = await ESignatureService.initiateLogin({
      country: 'TR',
      identifier: '+905321234567',
      ip: '1.2.3.4',
      ua: 'jest',
      purpose: 'login',
    });

    const out = await ESignatureService.pollStatus({ transactionId, ip: '1.2.3.4', ua: 'jest' });
    expect(out.status).toBe('failed');
    expect(redisStore.size).toBe(0);
  });
});
