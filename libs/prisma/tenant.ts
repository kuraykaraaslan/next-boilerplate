import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/tenant/client";
import { env } from "@/libs/env";

// ─── Shared default client ────────────────────────────────────────────────────
const defaultConnectionString = env.TENANT_DATABASE_URL;
const defaultSchema = new URL(defaultConnectionString).searchParams.get("schema") ?? undefined;
const defaultAdapter = new PrismaPg({ connectionString: defaultConnectionString }, { schema: defaultSchema });
export const tenantPrisma = new PrismaClient({ adapter: defaultAdapter });

// ─── Per-tenant dedicated client cache ───────────────────────────────────────
const MAX_DEDICATED_CLIENTS = 100;
const dedicatedClients = new Map<string, PrismaClient>();

function evictOldest(): void {
  const [key, client] = dedicatedClients.entries().next().value!;
  dedicatedClients.delete(key);
  client.$disconnect().catch(() => {});
}

/**
 * Returns the Prisma client for the given tenant.
 *
 * - If the tenant has a row in `TenantDatabase` (system DB), a dedicated client
 *   is created for that URL and cached (LRU-bounded to MAX_DEDICATED_CLIENTS).
 * - Otherwise the shared `tenantPrisma` (TENANT_DATABASE_URL) is returned.
 *
 * Call `clearTenantDbCache(tenantId)` after updating a tenant's databaseUrl.
 */
export async function tenantPrismaFor(tenantId: string): Promise<PrismaClient> {
  if (dedicatedClients.has(tenantId)) {
    return dedicatedClients.get(tenantId)!;
  }

  // Lazy import to avoid circular dependency (system ↔ tenant)
  const { systemPrisma } = await import("./system");

  const row = await systemPrisma.tenantDatabase.findUnique({
    where: { tenantId },
    select: { databaseUrl: true },
  });

  if (!row?.databaseUrl) {
    return tenantPrisma;
  }

  if (dedicatedClients.size >= MAX_DEDICATED_CLIENTS) {
    evictOldest();
  }

  const dedicatedSchema = new URL(row.databaseUrl).searchParams.get("schema") ?? undefined;
  const adapter = new PrismaPg({ connectionString: row.databaseUrl }, { schema: dedicatedSchema });
  const client = new PrismaClient({ adapter });
  dedicatedClients.set(tenantId, client);
  return client;
}

/**
 * Evict a tenant's cached client (e.g. after its databaseUrl is updated).
 * The next call to tenantPrismaFor() will re-read from system DB.
 */
export function clearTenantDbCache(tenantId: string): void {
  const client = dedicatedClients.get(tenantId);
  dedicatedClients.delete(tenantId);
  client?.$disconnect().catch(() => {});
}
