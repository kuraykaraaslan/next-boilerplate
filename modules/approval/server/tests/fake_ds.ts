import { randomUUID } from 'node:crypto';

/**
 * Minimal in-memory DataSource good enough for the approval-queue access
 * patterns: findOne/find/findAndCount with simple equality + `In(...)` where
 * clauses and single/multi-key ordering, save/create, a transaction
 * passthrough, and a no-op pessimistic lock. Mirrors the wallet test's fake
 * DataSource.
 */

const PK: Record<string, string> = {
  ApprovalQueueItem: 'approvalItemId',
};

// A TypeORM `In([...])` value, duck-typed (it carries `_type === 'in'`).
function isInOperator(v: unknown): v is { _type: string; _value: unknown[] } {
  return !!v && typeof v === 'object' && (v as { _type?: string })._type === 'in';
}

function matchValue(rowVal: unknown, whereVal: unknown): boolean {
  if (isInOperator(whereVal)) return whereVal._value.includes(rowVal ?? null);
  return (rowVal ?? null) === (whereVal ?? null);
}

function matches(row: Record<string, unknown>, where?: Record<string, unknown>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => matchValue(row[k], v));
}

function cmp(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'string' && /^\d+$/.test(a)) return Number(a) - Number(b as string);
  if (a! < b!) return -1;
  if (a! > b!) return 1;
  return 0;
}

function applyOrder(rows: Record<string, unknown>[], order?: Record<string, 'ASC' | 'DESC'>) {
  if (!order) return rows;
  const keys = Object.entries(order);
  return [...rows].sort((a, b) => {
    for (const [k, dir] of keys) {
      const c = dir === 'DESC' ? -cmp(a[k], b[k]) : cmp(a[k], b[k]);
      if (c !== 0) return c;
    }
    return 0;
  });
}

export interface FakeDs {
  store: Record<string, Record<string, unknown>[]>;
  getRepository: (entity: { name: string }) => ReturnType<typeof makeRepo>;
  transaction: (cb: (m: { getRepository: (e: { name: string }) => unknown }) => Promise<unknown>) => Promise<unknown>;
}

function makeRepo(store: Record<string, Record<string, unknown>[]>, name: string, tick: () => number) {
  const arr = () => store[name];
  return {
    create: (obj: Record<string, unknown>) => ({ ...obj }),
    save: (obj: Record<string, unknown>) => {
      const pk = PK[name];
      const n = tick();
      if (!obj[pk]) obj[pk] = randomUUID();
      // Stable, strictly increasing createdAt so ordering is deterministic.
      if (obj['createdAt'] === undefined) obj['createdAt'] = new Date(Date.now() + n);
      if (name === 'ApprovalQueueItem' && obj['updatedAt'] === undefined) {
        obj['updatedAt'] = new Date(Date.now() + n);
      }
      const list = arr();
      const idx = list.findIndex((r) => r[pk] === obj[pk]);
      if (idx >= 0) list[idx] = obj;
      else list.push(obj);
      return Promise.resolve(obj);
    },
    findOne: ({ where, order }: { where?: Record<string, unknown>; order?: Record<string, 'ASC' | 'DESC'> }) => {
      const rows = applyOrder(arr().filter((r) => matches(r, where)), order);
      return Promise.resolve(rows[0] ?? null);
    },
    find: ({ where, order, skip, take }: { where?: Record<string, unknown>; order?: Record<string, 'ASC' | 'DESC'>; skip?: number; take?: number }) => {
      let rows = applyOrder(arr().filter((r) => matches(r, where)), order);
      if (skip || take) rows = rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
      return Promise.resolve(rows);
    },
    findAndCount: ({ where, order, skip, take }: { where?: Record<string, unknown>; order?: Record<string, 'ASC' | 'DESC'>; skip?: number; take?: number }) => {
      const all = applyOrder(arr().filter((r) => matches(r, where)), order);
      const page = skip || take ? all.slice(skip ?? 0, (skip ?? 0) + (take ?? all.length)) : all;
      return Promise.resolve([page, all.length] as [Record<string, unknown>[], number]);
    },
  };
}

export function makeFakeDs(): FakeDs {
  const store: Record<string, Record<string, unknown>[]> = {
    ApprovalQueueItem: [],
  };
  let n = 0;
  const tick = () => (n += 1);

  const repoCache = new Map<string, ReturnType<typeof makeRepo>>();
  const getRepository = (entity: { name: string }) => {
    if (!repoCache.has(entity.name)) repoCache.set(entity.name, makeRepo(store, entity.name, tick));
    return repoCache.get(entity.name)!;
  };

  return {
    store,
    getRepository,
    transaction: async (cb) =>
      cb({
        // The transaction manager shares the same store.
        getRepository,
      }),
  } as FakeDs;
}
