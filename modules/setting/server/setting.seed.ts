import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { Setting } from './entities/setting.entity';

/**
 * Demo-data seed for the `setting` module.
 *
 * The `Setting` entity is a tenant-scoped key/value store with a composite
 * primary key `(tenantId, key)`, so:
 *  - it carries a `tenantId` column → use `ctx.repo<Setting>(Setting)` and set
 *    `tenantId: ctx.tenantId`;
 *  - the natural key for idempotent `foc` is the `(tenantId, key)` pair.
 *
 * `value` is always stored as `text` — non-string values are serialised to a
 * string and the `type` column ('string' | 'number' | 'boolean' | 'json' | …)
 * tells the reader how to coerce it back. `group` buckets keys for the admin
 * UI (General · Auth · Email · SMS · Storage · AI · Security · Payment ·
 * Subscription · Integrations · Analytics · SEO · Social · Localization).
 *
 * Every key string below is taken from a module's `*.setting.keys.ts` enum so
 * the values round-trip through `SettingService` exactly as the app expects.
 */
export async function seedSetting(ctx: SeedContext): Promise<void> {
  const { tenantId, foc } = ctx;
  const repo = ctx.repo<Setting>(Setting);

  // Concrete local type (do NOT use Partial<Setting>) so foc's create inference
  // stays intact under tsc.
  type SettingDef = { key: string; value: string; group: string; type: string };

  // ── Varied rows exercising different groups, types and value shapes ─────────
  const defs: SettingDef[] = [
    // General — site identity (string + boolean + maintenance toggle)
    { key: 'siteName', value: 'Acme Demo', group: 'General', type: 'string' },
    { key: 'siteUrl', value: 'https://demo.acme.test', group: 'General', type: 'string' },
    { key: 'maintenanceMode', value: 'false', group: 'General', type: 'boolean' },
    { key: 'contactEmail', value: 'hello@demo.acme.test', group: 'General', type: 'string' },

    // Auth — password policy
    { key: 'passwordMinLength', value: '12', group: 'Auth', type: 'number' },

    // Email — provider routing + numeric SMTP port
    { key: 'mailProvider', value: 'smtp', group: 'Email', type: 'string' },
    { key: 'fromEmail', value: 'noreply@demo.acme.test', group: 'Email', type: 'string' },
    { key: 'fromName', value: 'Acme Demo', group: 'Email', type: 'string' },
    { key: 'smtpPort', value: '587', group: 'Email', type: 'number' },

    // Storage — provider + numeric size limit + json allowlist
    { key: 'storageProvider', value: 's3', group: 'Storage', type: 'string' },
    { key: 'maxFileSizeMb', value: '25', group: 'Storage', type: 'number' },
    { key: 'allowedExtensions', value: JSON.stringify(['png', 'jpg', 'pdf']), group: 'Storage', type: 'json' },
    // Storage — MIME allowlist by group (comma-separated group keys: images,
    // documents, spreadsheets, presentations, archives, audio, video, data) plus
    // optional explicit MIME types; both empty = allow all.
    { key: 'allowedMimeGroups', value: 'images,documents', group: 'Storage', type: 'string' },
    { key: 'allowedMimeTypes', value: '', group: 'Storage', type: 'string' },
    // Storage — virus scanning (off by default; needs an API key to activate)
    { key: 'virusScanEnabled', value: 'false', group: 'Storage', type: 'boolean' },
    { key: 'virusScanMode', value: 'async', group: 'Storage', type: 'string' },
    { key: 'virusScanProvider', value: 'virustotal', group: 'Storage', type: 'string' },
    { key: 'virusScanApiKey', value: '', group: 'Storage', type: 'string' },
    { key: 'virusScanTimeoutSeconds', value: '30', group: 'Storage', type: 'number' },
    { key: 'virusScanInfectedAction', value: 'quarantine', group: 'Storage', type: 'string' },
    { key: 'virusScanQuarantineFolder', value: 'quarantine', group: 'Storage', type: 'string' },

    // Localization — formats + week start + currency placement
    { key: 'defaultTimezone', value: 'Europe/Istanbul', group: 'Localization', type: 'string' },
    { key: 'defaultLanguage', value: 'en', group: 'Localization', type: 'string' },
    { key: 'dateFormat', value: 'DD.MM.YYYY', group: 'Localization', type: 'string' },
    { key: 'weekStartsOn', value: '1', group: 'Localization', type: 'number' },
    { key: 'currencyPosition', value: 'suffix', group: 'Localization', type: 'string' },

    // SEO — robots + booleans + default OG image
    { key: 'metaRobots', value: 'index,follow', group: 'SEO', type: 'string' },
    { key: 'sitemapEnabled', value: 'true', group: 'SEO', type: 'boolean' },
    { key: 'twitterCardType', value: 'summary_large_image', group: 'SEO', type: 'string' },

    // Social — profile urls
    { key: 'twitterUrl', value: 'https://twitter.com/acmedemo', group: 'Social', type: 'string' },
    { key: 'githubProfileUrl', value: 'https://github.com/acmedemo', group: 'Social', type: 'string' },

    // Analytics — tracking id
    { key: 'googleTagId', value: 'G-DEMO12345', group: 'Analytics', type: 'string' },
  ];

  let count = 0;
  for (const def of defs) {
    await foc(
      repo,
      { tenantId, key: def.key } as FindOptionsWhere<Setting>,
      { tenantId, key: def.key, value: def.value, group: def.group, type: def.type },
    );
    count++;
  }

  ctx.log(`setting: ${count} key/value settings across ${new Set(defs.map((d) => d.group)).size} groups for ${tenantId}`);
}
