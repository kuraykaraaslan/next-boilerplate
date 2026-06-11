import 'reflect-metadata';
import 'dotenv/config';
import { runSeed } from '@/modules/seed/seed.runner';

/**
 * Seed the full demo dataset for a tenant.
 *
 *   npm run seed
 *   SEED_TENANT_ID=<tenant-uuid> npm run seed
 */
runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
