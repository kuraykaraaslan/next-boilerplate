// Publishes + installs @kimi/kimi AS A THIRD-PARTY community plugin, end-to-end via
// the real marketplace services (publisher → verify → listing → submit bundle →
// approve → install for a tenant → set the API-key secret). Requires DB + object
// storage (the bundle artifact is stored via StorageService) configured.
//
//   TARGET_TENANT_ID=<uuid> KIMI_API_KEY=sk-... npm run seed:kimi
//
// PUBLISHER_TENANT_ID defaults to ROOT. Idempotent-ish: re-running reuses the
// existing publisher/listing.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  applyAsPublisher, setPublisherStatus, getPublisherForTenant,
  upsertListing, listMyListings, submitVersion, reviewVersion,
} from '@kuraykaraaslan/marketplace/server/publish.service.next';
import { installCommunity } from '@kuraykaraaslan/marketplace/server/community-install.service.next';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { encryptField } from '@kuraykaraaslan/common/server/field-encryption';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';

const here = path.dirname(fileURLToPath(import.meta.url));
const bundleBase64 = Buffer.from(readFileSync(path.join(here, '../examples/kimi/plugin.js'), 'utf8')).toString('base64');
const manifest = JSON.parse(readFileSync(path.join(here, '../examples/kimi/manifest.json'), 'utf8'));

const PUBLISHER_TENANT = process.env.PUBLISHER_TENANT_ID || ROOT_TENANT_ID;
const TARGET_TENANT = process.env.TARGET_TENANT_ID;
const API_KEY = process.env.KIMI_API_KEY;

async function main() {
  // 1. Verified publisher @kimi.
  let publisher = await getPublisherForTenant(PUBLISHER_TENANT);
  if (!publisher) publisher = await applyAsPublisher(PUBLISHER_TENANT, { slug: 'kimi', displayName: 'Moonshot Kimi' });
  if (publisher.status !== 'verified') publisher = await setPublisherStatus(publisher.publisherId, 'verified', 'seed');
  console.log(`publisher @${publisher.slug} (${publisher.status})`);

  // 2. Listing @kimi/kimi.
  const existing = (await listMyListings(PUBLISHER_TENANT)).find((l) => l.scopedName === '@kimi/kimi');
  const listing = await upsertListing(PUBLISHER_TENANT, {
    listingId: existing?.listingId,
    moduleId: 'kimi',
    name: manifest.name,
    description: manifest.description,
    icon: manifest.icon,
    tier: 'ai',
    tags: ['ai', 'provider'],
    visibility: 'public',
  });
  console.log(`listing ${listing.scopedName} (${listing.listingId})`);

  // 3. Submit a version with the bundle + sandbox manifest, then approve it.
  const version = await submitVersion(PUBLISHER_TENANT, listing.listingId, {
    version: manifest.version,
    manifestJson: JSON.stringify(manifest),
    readmeMd: '# Kimi (Moonshot AI)\nSandboxed community AI provider.',
    bundleBase64,
  });
  await reviewVersion(version.versionId, 'approve', 'seed: trusted example', 'seed');
  console.log(`version ${version.version} approved → listing published`);

  // 4. Install for the target tenant + set the API-key secret (encrypted).
  if (!TARGET_TENANT) {
    console.log('No TARGET_TENANT_ID — published only. Set it (and KIMI_API_KEY) to install + configure.');
    return;
  }
  await installCommunity(TARGET_TENANT, listing.listingId, 'seed');
  console.log(`installed for tenant ${TARGET_TENANT}`);
  if (API_KEY) {
    await SettingService.updateMany(TARGET_TENANT, { 'plugin_secret:@kimi/kimi:apiKey': encryptField(API_KEY) }, { actorId: 'seed' });
    await SettingService.updateMany(TARGET_TENANT, { aiDefaultProvider: 'kimi' }, { actorId: 'seed' });
    console.log('set encrypted apiKey secret + aiDefaultProvider=kimi');
  } else {
    console.log('No KIMI_API_KEY — set plugin_secret:@kimi/kimi:apiKey before using.');
  }
  console.log('\nDone. Kimi now answers via AIProviderService (provider key "kimi"), sandboxed.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
