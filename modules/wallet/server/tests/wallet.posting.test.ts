import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

vi.mock('@kuraykaraaslan/env', () => ({
  env: { DATABASE_URL: 'postgresql://test', NODE_ENV: 'test' },
}));
vi.mock('@kuraykaraaslan/redis', () => ({
  default: { set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1) },
}));
vi.mock('@kuraykaraaslan/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('@kuraykaraaslan/webhook/server/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => {}) },
}));
vi.mock('@kuraykaraaslan/db', () => ({ tenantDataSourceFor: vi.fn() }));

import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import WalletService from '../wallet.service';
import { WALLET_MESSAGES } from '../wallet.messages';

// ── Minimal in-memory DataSource good enough for the ledger's access pattern ──
const PK: Record<string, string> = {
  WalletAccount: 'walletAccountId',
  WalletTransaction: 'walletTransactionId',
  WalletPosting: 'walletPostingId',
};

function matches(row: Record<string, unknown>, where?: Record<string, unknown>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => (row[k] ?? null) === (v ?? null));
}

function cmp(a: unknown, b: unknown): number {
  if (typeof a === 'string' && /^\d+$/.test(a)) return Number(a) - Number(b as string);
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (a! < b!) return -1;
  if (a! > b!) return 1;
  return 0;
}

function makeFakeDs() {
  const store: Record<string, Record<string, unknown>[]> = {
    WalletAccount: [],
    WalletTransaction: [],
    WalletPosting: [],
  };
  let uid = 0;
  let seq = 0;

  const repoFor = (name: string) => ({
    create: (obj: Record<string, unknown>) => ({ ...obj }),
    save: (obj: Record<string, unknown>) => {
      const pk = PK[name];
      uid += 1;
      if (!obj[pk]) obj[pk] = randomUUID();
      if (name === 'WalletPosting' && obj['seq'] === undefined) obj['seq'] = String(++seq);
      if (obj['createdAt'] === undefined) obj['createdAt'] = new Date(Date.now() + uid);
      if (name !== 'WalletPosting' && obj['updatedAt'] === undefined) obj['updatedAt'] = new Date();
      if (name === 'WalletAccount' && obj['metadata'] === undefined) obj['metadata'] = null;
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
  });

  return {
    store,
    getRepository: (entity: { name: string }) => repoFor(entity.name),
    transaction: async (cb: (m: unknown) => Promise<unknown>) =>
      cb({ getRepository: (entity: { name: string }) => repoFor(entity.name) }),
  };
}

const TENANT = '660e8400-e29b-41d4-a716-446655440000';
const USER_A = '770e8400-e29b-41d4-a716-446655440001';
const USER_B = '770e8400-e29b-41d4-a716-446655440002';

let fake: ReturnType<typeof makeFakeDs>;

beforeEach(() => {
  fake = makeFakeDs();
  (tenantDataSourceFor as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(fake);
});

describe('WalletService.issue', () => {
  it('credits a user wallet and keeps the ledger balanced', async () => {
    await WalletService.issue(TENANT, { userId: USER_A, amount: '1000', currency: 'CREDIT' });
    expect(await WalletService.getOrCreateUserWallet(TENANT, USER_A, 'CREDIT').then((w) => w.cachedBalance)).toBe('1000');
    const rec = await WalletService.reconcile(TENANT, 'CREDIT');
    expect(rec.ok).toBe(true);
    expect(rec.sumByCurrency['CREDIT']).toBe('0');
  });
});

describe('WalletService.transfer', () => {
  it('moves credits between two wallets', async () => {
    await WalletService.issue(TENANT, { userId: USER_A, amount: '1000' });
    await WalletService.transfer(TENANT, { fromUserId: USER_A, toUserId: USER_B, amount: '300' });
    const a = await WalletService.getOrCreateUserWallet(TENANT, USER_A);
    const b = await WalletService.getOrCreateUserWallet(TENANT, USER_B);
    expect(a.cachedBalance).toBe('700');
    expect(b.cachedBalance).toBe('300');
    expect((await WalletService.reconcile(TENANT)).ok).toBe(true);
  });

  it('rejects a transfer exceeding the balance', async () => {
    await WalletService.issue(TENANT, { userId: USER_A, amount: '100' });
    await expect(
      WalletService.transfer(TENANT, { fromUserId: USER_A, toUserId: USER_B, amount: '500' }),
    ).rejects.toThrow(WALLET_MESSAGES.INSUFFICIENT_FUNDS);
  });
});

describe('WalletService.postRaw', () => {
  it('rejects an unbalanced transaction', async () => {
    await WalletService.ensureSystemAccounts(TENANT, 'CREDIT');
    const issuer = fake.store.WalletAccount.find((a) => a['kind'] === 'SYSTEM_ISSUER')!;
    const revenue = fake.store.WalletAccount.find((a) => a['kind'] === 'SYSTEM_REVENUE')!;
    await expect(
      WalletService.postRaw(TENANT, {
        type: 'ADJUSTMENT',
        currency: 'CREDIT',
        entries: [
          { accountId: issuer['walletAccountId'] as string, amount: '-100' },
          { accountId: revenue['walletAccountId'] as string, amount: '50' },
        ],
      }),
    ).rejects.toThrow(WALLET_MESSAGES.NOT_BALANCED);
  });
});

describe('idempotency', () => {
  it('replays the same transaction instead of double-posting', async () => {
    const key = 'issue-once-1';
    await WalletService.issue(TENANT, { userId: USER_A, amount: '500', idempotencyKey: key });
    await WalletService.issue(TENANT, { userId: USER_A, amount: '500', idempotencyKey: key });
    const a = await WalletService.getOrCreateUserWallet(TENANT, USER_A);
    expect(a.cachedBalance).toBe('500');
    expect(fake.store.WalletTransaction.length).toBe(1);
  });
});

describe('verifyChain', () => {
  it('passes for an untampered ledger', async () => {
    await WalletService.issue(TENANT, { userId: USER_A, amount: '1000' });
    await WalletService.transfer(TENANT, { fromUserId: USER_A, toUserId: USER_B, amount: '400' });
    expect((await WalletService.verifyChain(TENANT)).ok).toBe(true);
  });

  it('detects a tampered posting amount', async () => {
    await WalletService.issue(TENANT, { userId: USER_A, amount: '1000' });
    const posting = fake.store.WalletPosting[0];
    posting['amount'] = (posting['amount'] as bigint) + BigInt(1); // tamper
    const result = await WalletService.verifyChain(TENANT);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(posting['walletPostingId']);
  });
});
