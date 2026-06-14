import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

vi.mock('@/modules/env', () => ({
  env: { DATABASE_URL: 'postgresql://test', NODE_ENV: 'test' },
}));
vi.mock('@/modules/redis', () => ({
  default: {
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
  },
}));
vi.mock('@/modules/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/modules/webhook/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => {}) },
}));
vi.mock('@/modules/db', () => ({ tenantDataSourceFor: vi.fn() }));

// ── Mock the two external rails so we can assert the split deterministically ──
const walletState = { balance: BigInt(0) };
const spendMock = vi.fn(async (_t: string, dto: { amount: string }) => {
  walletState.balance -= BigInt(dto.amount);
  return { walletTransactionId: randomUUID() };
});
const getWalletMock = vi.fn(async () => ({ cachedBalance: walletState.balance.toString() }));
vi.mock('@/modules/wallet', () => ({
  WalletService: {
    spend: (...a: unknown[]) => spendMock(...(a as [string, { amount: string }])),
    getOrCreateUserWallet: (...a: unknown[]) => getWalletMock(...(a as [])),
  },
}));

const createInvoiceMock = vi.fn(async (_t: string, input: { lines: { unitPrice: number }[] }) => ({
  invoiceId: randomUUID(),
  __lines: input.lines,
}));
vi.mock('@/modules/invoice/invoice.service', () => ({
  default: { create: (...a: unknown[]) => createInvoiceMock(...(a as [string, { lines: { unitPrice: number }[] }])) },
}));

import { tenantDataSourceFor } from '@/modules/db';
import MeteringService from '../metering.service';

// ── Minimal in-memory DataSource (mirrors wallet's fake) ──
const PK: Record<string, string> = {
  MeterDefinition: 'meterId',
  MeteredUsageEvent: 'usageEventId',
  MeteredBillingRun: 'billingRunId',
};

function matches(row: Record<string, unknown>, where?: Record<string, unknown>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    return (row[k] ?? null) === (v ?? null);
  });
}

function cmp(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'string' && /^\d+$/.test(a)) return Number(a) - Number(b as string);
  if (a! < b!) return -1;
  if (a! > b!) return 1;
  return 0;
}

function makeFakeDs() {
  const store: Record<string, Record<string, unknown>[]> = {
    MeterDefinition: [],
    MeteredUsageEvent: [],
    MeteredBillingRun: [],
  };
  let uid = 0;

  const repoFor = (name: string) => ({
    create: (obj: Record<string, unknown>) => ({ ...obj }),
    save: (obj: Record<string, unknown>) => {
      const pk = PK[name];
      uid += 1;
      if (!obj[pk]) obj[pk] = randomUUID();
      if (obj['createdAt'] === undefined) obj['createdAt'] = new Date(Date.now() + uid);
      if (obj['updatedAt'] === undefined) obj['updatedAt'] = new Date();
      if (name === 'MeterDefinition' && obj['metadata'] === undefined) obj['metadata'] = null;
      if (name === 'MeterDefinition' && obj['deletedAt'] === undefined) obj['deletedAt'] = null;
      const arr = store[name];
      const idx = arr.findIndex((r) => r[pk] === obj[pk]);
      if (idx >= 0) arr[idx] = obj;
      else arr.push(obj);
      return Promise.resolve(obj);
    },
    findOne: ({ where, order }: { where?: Record<string, unknown>; order?: Record<string, 'ASC' | 'DESC'> }) => {
      let rows = store[name].filter((r) => matches(r, where));
      if (order) {
        const [k, dir] = Object.entries(order)[0];
        rows = [...rows].sort((a, b) => (dir === 'DESC' ? -cmp(a[k], b[k]) : cmp(a[k], b[k])));
      }
      return Promise.resolve(rows[0] ?? null);
    },
    find: ({ where, order }: { where?: Record<string, unknown>; order?: Record<string, 'ASC' | 'DESC'> }) => {
      let rows = store[name].filter((r) => matches(r, where));
      if (order) {
        const keys = Object.entries(order);
        rows = [...rows].sort((a, b) => {
          for (const [k, dir] of keys) {
            const c = dir === 'DESC' ? -cmp(a[k], b[k]) : cmp(a[k], b[k]);
            if (c !== 0) return c;
          }
          return 0;
        });
      }
      return Promise.resolve(rows);
    },
    findAndCount: ({ where }: { where?: Record<string, unknown> }) => {
      const rows = store[name].filter((r) => matches(r, where));
      return Promise.resolve([rows, rows.length]);
    },
  });

  return {
    store,
    getRepository: (entity: { name: string }) => repoFor(entity.name),
    transaction: async (cb: (m: unknown) => Promise<unknown>) =>
      cb({ getRepository: (entity: { name: string }) => repoFor(entity.name) }),
  };
}

const TENANT = '660e8400-e29b-41d4-a716-446655440000';
const USER = '770e8400-e29b-41d4-a716-446655440001';

let fake: ReturnType<typeof makeFakeDs>;

beforeEach(() => {
  fake = makeFakeDs();
  (tenantDataSourceFor as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(fake);
  walletState.balance = BigInt(0);
  spendMock.mockClear();
  createInvoiceMock.mockClear();
  getWalletMock.mockClear();
});

async function seedMeter(opts?: { included?: string; price?: string }) {
  return MeteringService.createMeter(TENANT, {
    key: 'api_calls',
    name: 'API Calls',
    unit: 'request',
    aggregation: 'SUM',
    unitPriceMinor: opts?.price ?? '2',
    currency: 'USD',
    includedQuantity: opts?.included ?? '100',
    active: true,
  });
}

describe('runBilling — two-rail settlement', () => {
  it('(a) usage below included allowance bills nothing', async () => {
    await seedMeter({ included: '100', price: '2' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '50', subjectType: 'TENANT' });

    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;
    const run = await MeteringService.runBilling(TENANT, { subjectType: 'TENANT', periodKey: period });

    expect(run.status).toBe('COMPLETED');
    expect(run.totalMinor).toBe('0');
    expect(run.walletDebitedMinor).toBe('0');
    expect(run.invoicedMinor).toBe('0');
    expect(spendMock).not.toHaveBeenCalled();
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('(b) wallet fully covers the overage — no invoice', async () => {
    await seedMeter({ included: '100', price: '2' });
    // used 200 → billable 100 → amount 200
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '200', subjectType: 'USER', subjectId: USER });
    walletState.balance = BigInt(1000); // plenty

    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;
    const run = await MeteringService.runBilling(TENANT, {
      subjectType: 'USER',
      subjectId: USER,
      periodKey: period,
    });

    expect(run.status).toBe('COMPLETED');
    expect(run.totalMinor).toBe('200');
    expect(run.walletDebitedMinor).toBe('200');
    expect(run.invoicedMinor).toBe('0');
    expect(run.invoiceId).toBeNull();
    expect(spendMock).toHaveBeenCalledTimes(1);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('(c) wallet partially covers — wallet debited + invoice for remainder', async () => {
    await seedMeter({ included: '100', price: '2' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '200', subjectType: 'USER', subjectId: USER });
    walletState.balance = BigInt(50); // covers 50 of 200

    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;
    const run = await MeteringService.runBilling(TENANT, {
      subjectType: 'USER',
      subjectId: USER,
      periodKey: period,
      customerEmail: 'cust@example.com',
      customerName: 'Acme',
      customerCountryCode: 'US',
    });

    expect(run.status).toBe('COMPLETED');
    expect(run.totalMinor).toBe('200');
    expect(run.walletDebitedMinor).toBe('50');
    expect(run.invoicedMinor).toBe('150');
    expect(run.invoiceId).not.toBeNull();
    expect(spendMock).toHaveBeenCalledTimes(1);
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    // The invoice line(s) must sum to the remainder in major units (150 minor = 1.5).
    const invoiced = createInvoiceMock.mock.results[0].value as Promise<{ __lines: { unitPrice: number }[] }>;
    const lines = (await invoiced).__lines;
    const sum = lines.reduce((acc, l) => acc + l.unitPrice, 0);
    expect(Math.round(sum * 100)).toBe(150);
  });

  it('(d) idempotent replay returns the same run and does not double-charge', async () => {
    await seedMeter({ included: '100', price: '2' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '200', subjectType: 'USER', subjectId: USER });
    walletState.balance = BigInt(1000);
    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;

    const run1 = await MeteringService.runBilling(TENANT, {
      subjectType: 'USER', subjectId: USER, periodKey: period, idempotencyKey: 'run-once',
    });
    const run2 = await MeteringService.runBilling(TENANT, {
      subjectType: 'USER', subjectId: USER, periodKey: period, idempotencyKey: 'run-once',
    });

    expect(run2.billingRunId).toBe(run1.billingRunId);
    expect(spendMock).toHaveBeenCalledTimes(1);
    expect(fake.store.MeteredBillingRun.length).toBe(1);
  });

  it('invoices the full overage when no wallet owner is resolvable (TENANT subject)', async () => {
    await seedMeter({ included: '0', price: '5' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '10', subjectType: 'TENANT' });
    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;

    const run = await MeteringService.runBilling(TENANT, {
      subjectType: 'TENANT',
      periodKey: period,
      customerEmail: 'cust@example.com',
      customerName: 'Acme',
      customerCountryCode: 'US',
    });

    expect(run.totalMinor).toBe('50');
    expect(run.walletDebitedMinor).toBe('0');
    expect(run.invoicedMinor).toBe('50');
    expect(spendMock).not.toHaveBeenCalled();
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
  });
});

describe('recordEvent — idempotency + aggregation', () => {
  it('(e) replays the same event instead of double-counting', async () => {
    await seedMeter({ included: '0', price: '1' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '5', subjectType: 'TENANT', idempotencyKey: 'evt-1' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'api_calls', quantity: '5', subjectType: 'TENANT', idempotencyKey: 'evt-1' });
    expect(fake.store.MeteredUsageEvent.length).toBe(1);
  });

  it('MAX aggregation returns the highest single reading', async () => {
    await MeteringService.createMeter(TENANT, {
      key: 'peak_seats', name: 'Peak Seats', unit: 'seat', aggregation: 'MAX',
      unitPriceMinor: '0', currency: 'USD', includedQuantity: '0', active: true,
    });
    await MeteringService.recordEvent(TENANT, { meterKey: 'peak_seats', quantity: '5', subjectType: 'TENANT' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'peak_seats', quantity: '12', subjectType: 'TENANT' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'peak_seats', quantity: '8', subjectType: 'TENANT' });
    const period = (await MeteringService.getUsage(TENANT, {})).periodKey;
    const used = await MeteringService.aggregate(TENANT, 'peak_seats', period);
    expect(used).toBe(BigInt(12));
  });

  it('LAST aggregation returns the most recent reading', async () => {
    await MeteringService.createMeter(TENANT, {
      key: 'gauge', name: 'Gauge', unit: 'gb', aggregation: 'LAST',
      unitPriceMinor: '0', currency: 'USD', includedQuantity: '0', active: true,
    });
    await MeteringService.recordEvent(TENANT, { meterKey: 'gauge', quantity: '3', subjectType: 'TENANT', occurredAt: '2026-06-01T00:00:00.000Z' });
    await MeteringService.recordEvent(TENANT, { meterKey: 'gauge', quantity: '9', subjectType: 'TENANT', occurredAt: '2026-06-10T00:00:00.000Z' });
    const used = await MeteringService.aggregate(TENANT, 'gauge', '2026-06');
    expect(used).toBe(BigInt(9));
  });
});
