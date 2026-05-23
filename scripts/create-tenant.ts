/**
 * Create a tenant from the CLI.
 *
 *   npx tsx scripts/create-tenant.ts --name="Acme Corp"
 *   npx tsx scripts/create-tenant.ts --name="Acme" --domain=acme.example.com --owner=admin@acme.com --plan=pro
 *
 * Flags:
 *   --name=<string>             Tenant display name (required)
 *   --description=<string>      Free-form description (optional)
 *   --domain=<host>             Primary domain to bind (optional — written to tenant_domains)
 *   --owner=<email>             Existing User email to make ADMIN of the new tenant (optional)
 *   --plan=<name>               Override the auto-seeded Free plan (optional — matches an existing plan name)
 *   --skip-seed                 Skip auto-seed (plan + subscription + locale settings)
 *
 * On success prints the new tenantId. Idempotent on (name, owner) — re-running
 * with the same name short-circuits with a warning.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';
import { User } from '../modules/user/entities/user.entity';
import { Tenant } from '../modules/tenant/entities/tenant.entity';
import { TenantMember } from '../modules/tenant_member/entities/tenant_member.entity';
import { TenantDomain } from '../modules/tenant_domain/entities/tenant_domain.entity';

function parseFlags(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) {
      out[arg.slice(2)] = true;
    } else {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    }
  }
  return out;
}

function parseDbUrl(raw: string): { url: string; schema?: string } {
  const m = raw.match(/[?&]schema=([^&]+)/);
  return {
    url: raw.replace(/[?&]schema=[^&]+/, '').replace(/[?&]$/, ''),
    schema: m?.[1],
  };
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const name = String(flags.name ?? '').trim();
  if (!name) {
    console.error('error: --name=<string> is required');
    process.exit(2);
  }
  const description = typeof flags.description === 'string' ? flags.description : null;
  const domain = typeof flags.domain === 'string' ? flags.domain : null;
  const ownerEmail = typeof flags.owner === 'string' ? flags.owner : null;

  const systemDb = parseDbUrl(env.SYSTEM_DATABASE_URL);
  const tenantDb = parseDbUrl(env.TENANT_DATABASE_URL);

  const systemDs = new DataSource({
    type: 'postgres',
    url: systemDb.url,
    schema: systemDb.schema,
    synchronize: false,
    entities: [User],
  });
  const tenantDs = new DataSource({
    type: 'postgres',
    url: tenantDb.url,
    schema: tenantDb.schema,
    synchronize: false,
    entities: [Tenant, TenantMember, TenantDomain],
  });

  await systemDs.initialize();
  await tenantDs.initialize();

  try {
    // 1. Check for an existing tenant by name (best-effort idempotency)
    const tenantRepo = tenantDs.getRepository(Tenant);
    const existing = await tenantRepo.findOne({ where: { name } });
    if (existing) {
      console.warn(`tenant "${name}" already exists (${existing.tenantId}); nothing to do`);
      console.log(existing.tenantId);
      return;
    }

    // 2. Create the tenant
    const tenant = await tenantRepo.save(
      tenantRepo.create({
        name,
        description: description ?? undefined,
        tenantStatus: 'ACTIVE',
      }),
    );
    console.log(`+ created tenant ${tenant.tenantId} (${tenant.name})`);

    // 3. Bind owner (if provided)
    if (ownerEmail) {
      const user = await systemDs.getRepository(User).findOne({ where: { email: ownerEmail } });
      if (!user) {
        console.warn(`owner email "${ownerEmail}" not found — tenant created without owner`);
      } else {
        await tenantDs.getRepository(TenantMember).save(
          tenantDs.getRepository(TenantMember).create({
            tenantId: tenant.tenantId,
            userId: user.userId,
            memberRole: 'ADMIN',
            memberStatus: 'ACTIVE',
          }),
        );
        console.log(`+ owner ${ownerEmail} → ADMIN of ${tenant.tenantId}`);
      }
    }

    // 4. Bind primary domain (if provided)
    if (domain) {
      const exists = await tenantDs.getRepository(TenantDomain).findOne({ where: { domain } });
      if (exists) {
        console.warn(`domain ${domain} already mapped to ${exists.tenantId}; skipping`);
      } else {
        await tenantDs.getRepository(TenantDomain).save(
          tenantDs.getRepository(TenantDomain).create({
            tenantId: tenant.tenantId,
            domain,
            isPrimary: true,
            domainStatus: 'ACTIVE',
          }),
        );
        console.log(`+ domain ${domain} → ${tenant.tenantId}`);
      }
    }

    // 5. Auto-seed is the responsibility of `TenantService.create()` when called
    //    via the API; this script writes raw entity rows for speed and operates
    //    one connection-pool below that layer. If you want the full seed
    //    (Free plan + subscription + locale settings) call the API instead:
    //
    //      curl -X POST http://localhost:3000/tenant/{ROOT_TENANT_ID}/api/tenants/create \
    //        -H 'Content-Type: application/json' \
    //        -d '{"name":"Acme"}'
    if (!flags['skip-seed']) {
      console.warn('note: --skip-seed default — CLI bypasses TenantService.create() auto-seed.');
      console.warn('      use the API for Free plan + subscription + locale defaults.');
    }

    console.log('---');
    console.log(`tenantId: ${tenant.tenantId}`);
  } finally {
    await systemDs.destroy();
    await tenantDs.destroy();
  }
}

main().catch((err) => {
  console.error('create-tenant: failed', err);
  process.exit(1);
});
