import 'reflect-metadata';
import 'dotenv/config';
import { getDataSource } from '@/modules/db';

/**
 * One-time data migration: normalise legacy `plan_features.type` values to the
 * canonical 2-type model (see modules/tenant_subscription/tenant_subscription.enums.ts).
 *
 * Older seeds wrote `NUMBER` / `TEXT`, but the type is now restricted to
 * `BOOLEAN` (on/off flag) | `LIMIT` (numeric quota). The plans admin page
 * validates rows with PlanFeatureTypeEnum, so any legacy row makes the page
 * throw a Zod `invalid_value` error. Re-seeding does NOT fix these rows because
 * the seed uses find-or-create and never rewrites an existing row's `type`.
 *
 *   NUMBER → LIMIT   (numeric quota; value kept verbatim)
 *   TEXT   → BOOLEAN (flag; non-empty & not falsy → 'true', else 'false')
 *
 * Idempotent: re-running is a no-op once no legacy rows remain.
 */
async function main() {
  const ds = await getDataSource();

  // NUMBER → LIMIT (value is already a numeric string).
  const numberRes = await ds.query(
    `UPDATE plan_features SET type = 'LIMIT', "updatedAt" = now() WHERE type = 'NUMBER'`,
  );

  // TEXT → BOOLEAN. Normalise the free-text value to a boolean flag: an empty
  // string or a falsy keyword becomes 'false', anything else means "enabled".
  const textRes = await ds.query(
    `UPDATE plan_features
       SET type = 'BOOLEAN',
           value = CASE
             WHEN lower(coalesce(value, '')) IN ('', 'false', '0', 'no', 'off') THEN 'false'
             ELSE 'true'
           END,
           "updatedAt" = now()
     WHERE type = 'TEXT'`,
  );

  // affectedRows shape differs per driver; pg returns rowCount on the command tag.
  const numberCount = Array.isArray(numberRes) ? numberRes[1] ?? 0 : numberRes;
  const textCount = Array.isArray(textRes) ? textRes[1] ?? 0 : textRes;
  console.log(`plan_features: NUMBER→LIMIT updated=${numberCount}, TEXT→BOOLEAN updated=${textCount}`);

  const remaining = await ds.query(
    `SELECT type, COUNT(*)::int AS n FROM plan_features GROUP BY type ORDER BY type`,
  );
  console.log('plan_features type distribution:', JSON.stringify(remaining));

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
