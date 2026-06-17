import 'reflect-metadata';
import 'dotenv/config';
import { deployDatabase, resolveDeployTarget } from '@kuraykaraaslan/db/server/db.deploy';

/**
 * Production deploy migration — wired into `vercel-build` so a fresh or
 * existing database is brought fully up to date on every deploy. The actual
 * three-phase pipeline (schema sync → SQL migrations → bootstrap seed) lives in
 * `modules/db/db.deploy.ts`, shared with the demo-reset cron. Safe to re-run.
 *
 *   npx tsx scripts/db-deploy.ts
 */
async function main(): Promise<void> {
  const target = resolveDeployTarget();
  if (!target) {
    // No database configured (e.g. a preview build without DB env). Skip rather
    // than fail the build — the runtime would surface a clearer error.
    console.warn('[db-deploy] DATABASE_URL not set — skipping migrations.');
    return;
  }
  await deployDatabase(target);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
