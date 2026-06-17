import { vi } from 'vitest';
import { randomUUID } from 'node:crypto';

vi.mock('@kuraykaraaslan/env', () => ({
  env: { DATABASE_URL: 'postgresql://test', NODE_ENV: 'test' },
}));
vi.mock('@kuraykaraaslan/redis', () => ({
  default: {
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
  },
}));
vi.mock('@kuraykaraaslan/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('@kuraykaraaslan/webhook/server/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => {}) },
}));
vi.mock('@kuraykaraaslan/db', () => ({ tenantDataSourceFor: vi.fn() }));

// ── Mock the two external rails so we can assert the split deterministically ──
export const walletState = { balance: BigInt(0) };
export const spendMock = vi.fn(async (_t: string, dto: { amount: string }) => {
  walletState.balance -= BigInt(dto.amount);
  return { walletTransactionId: randomUUID() };
});
export const getWalletMock = vi.fn(async () => ({ cachedBalance: walletState.balance.toString() }));
vi.mock('@kuraykaraaslan/wallet', () => ({
  WalletService: {
    spend: (...a: unknown[]) => spendMock(...(a as [string, { amount: string }])),
    getOrCreateUserWallet: (...a: unknown[]) => getWalletMock(...(a as [])),
  },
}));

export const createInvoiceMock = vi.fn(async (_t: string, input: { lines: { unitPrice: number }[] }) => ({
  invoiceId: randomUUID(),
  __lines: input.lines,
}));
vi.mock('@kuraykaraaslan/invoice/server/invoice.service', () => ({
  default: { create: (...a: unknown[]) => createInvoiceMock(...(a as [string, { lines: { unitPrice: number }[] }])) },
}));

import { tenantDataSourceFor } from '@kuraykaraaslan/db';
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

export function makeFakeDs() {
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

export const TENANT = '660e8400-e29b-41d4-a716-446655440000';
export const USER = '770e8400-e29b-41d4-a716-446655440001';

/** Reset all mocks + a fresh in-memory DataSource. Returns the new fake DS. */
export function resetMeteringMocks(): ReturnType<typeof makeFakeDs> {
  const fake = makeFakeDs();
  (tenantDataSourceFor as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(fake);
  walletState.balance = BigInt(0);
  spendMock.mockClear();
  createInvoiceMock.mockClear();
  getWalletMock.mockClear();
  return fake;
}

export async function seedMeter(opts?: { included?: string; price?: string }) {
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
