import 'reflect-metadata';
import type {
  DataSource,
  Repository,
  FindOptionsWhere,
  DeepPartial,
  ObjectLiteral,
} from 'typeorm';
import { SeedFaker } from './seed.faker';

/** Named seed profiles control how much data each module produces. */
export type SeedProfile = 'minimal' | 'demo' | 'stress';

/** Per-profile multiplier for "how many rows" decisions in seeders. */
export const PROFILE_SCALE: Record<SeedProfile, number> = { minimal: 1, demo: 5, stress: 100 };

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
  /** Active named profile (minimal/demo/stress) — scales row counts. */
  profile: SeedProfile;
  /** Default locale + country + currencies for locale/country-aware data. */
  locale: string;
  country: string;
  currencies: string[];
  /** Deterministic, locale-aware data generator for realistic seed data. */
  faker: SeedFaker;
  /** Profile-scaled count: `ctx.count(2)` → 2 (minimal), 10 (demo), 200 (stress). */
  count(base: number): number;
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

export function makeSeedContext(
  ds: DataSource,
  systemDs: DataSource,
  tenantId: string,
  opts: { profile?: SeedProfile; locale?: string; country?: string; currencies?: string[] } = {},
): SeedContext {
  const profile = opts.profile ?? 'demo';
  const locale = opts.locale ?? 'en';
  const country = opts.country ?? 'US';
  const currencies = opts.currencies ?? ['USD', 'EUR', 'TRY'];
  const scale = PROFILE_SCALE[profile];
  return {
    ds,
    systemDs,
    tenantId,
    refs: { userId: SEED_USER_ID, adminUserId: SEED_ADMIN_USER_ID },
    profile,
    locale,
    country,
    currencies,
    faker: new SeedFaker(`${tenantId}:${profile}`, locale),
    count(base: number) { return Math.max(0, Math.round(base * scale)); },
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
