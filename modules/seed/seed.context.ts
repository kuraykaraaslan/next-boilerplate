import 'reflect-metadata';
import type {
  DataSource,
  Repository,
  FindOptionsWhere,
  DeepPartial,
  ObjectLiteral,
} from 'typeorm';

// ============================================================================
// Deterministic ids
// ----------------------------------------------------------------------------
// Shared across every module seed so cross-references (a review's userId, an
// invoice's orderId, …) stay stable across re-runs. They are plain uuids — the
// tenant DBs store these as columns without cross-database FK constraints, so a
// matching row does not need to physically exist in another database.
// ============================================================================

export const SEED_USER_ID = 'a0000000-0000-4000-8000-000000000001';
export const SEED_ADMIN_USER_ID = 'a0000000-0000-4000-8000-000000000002';
export const SEED_ORDER_ID = 'b0000000-0000-4000-8000-000000000001';

/**
 * Bag of cross-module references a seed produces for later seeds to consume.
 *
 *   producer:  ctx.refs.productId = product.productId
 *   consumer:  const productId = ctx.refs.productId
 *
 * Common cross-module keys are typed below for discoverability; the index
 * signature lets any module stash its own private references without having to
 * edit this interface (keeps parallel authoring conflict-free).
 */
export interface SeedRefs {
  // identity
  userId?: string;
  adminUserId?: string;
  // store catalog
  categoryId?: string;
  productId?: string;
  planProductId?: string;
  productVariantId?: string;
  bundleId?: string;
  // commerce
  cartId?: string;
  couponCode?: string;
  orderId?: string;
  paymentId?: string;
  subscriptionPlanId?: string;
  shippingMethodId?: string;
  taxClassId?: string;
  // anything else a module wants to publish
  [key: string]: unknown;
}

export interface SeedContext {
  /** Tenant-scoped DataSource — use for entities that have a `tenantId` column. */
  ds: DataSource;
  /** System/global DataSource — use for entities WITHOUT a `tenantId` column. */
  systemDs: DataSource;
  tenantId: string;
  refs: SeedRefs;
  /**
   * find-or-create: returns the row matched by `where`, otherwise inserts
   * `create`. Every seed uses this so re-running reuses existing rows by a
   * natural key (slug / code / sku / composite) instead of duplicating them.
   */
  foc<T extends ObjectLiteral>(
    repo: Repository<T>,
    where: FindOptionsWhere<T>,
    create: DeepPartial<T>,
  ): Promise<T>;
  /** Tenant-scoped repository: `ctx.repo(Entity)` ≡ `ctx.ds.getRepository(Entity)`. */
  repo<T extends ObjectLiteral>(entity: { new (): T } | Function): Repository<T>;
  /** System-scoped repository for entities without a `tenantId` column. */
  systemRepo<T extends ObjectLiteral>(entity: { new (): T } | Function): Repository<T>;
  /** Structured progress line. */
  log(message: string): void;
}

export function makeSeedContext(ds: DataSource, systemDs: DataSource, tenantId: string): SeedContext {
  return {
    ds,
    systemDs,
    tenantId,
    refs: { userId: SEED_USER_ID, adminUserId: SEED_ADMIN_USER_ID },
    async foc(repo, where, create) {
      const found = await repo.findOne({ where });
      if (found) return found;
      return repo.save(repo.create(create));
    },
    repo(entity) {
      return ds.getRepository(entity as never);
    },
    systemRepo(entity) {
      return systemDs.getRepository(entity as never);
    },
    log(message) {
      // eslint-disable-next-line no-console
      console.log(`[seed] ${message}`);
    },
  };
}

/** Signature every module's `<module>.seed.ts` exports as `seed<Module>`. */
export type ModuleSeeder = (ctx: SeedContext) => Promise<void>;
