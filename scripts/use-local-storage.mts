// Switches a tenant's storage backend to the local filesystem provider
// (module `storage_local`). Enables the provider module for the tenant and sets
// `storageProvider=local`, so server-side uploads (e.g. marketplace plugin
// bundles) work without S3/MinIO. Dev/offline convenience.
//
//   TENANT_ID=<uuid> npm run storage:local      # defaults to ROOT tenant
//
// Objects are written under LOCAL_STORAGE_DIR (default <cwd>/.local-storage).

import 'reflect-metadata';
import 'dotenv/config';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';

const TENANT_ID = process.env.TENANT_ID || ROOT_TENANT_ID;

async function main() {
  await SettingService.updateMany(TENANT_ID, {
    'module.storage_local.enabled': 'true',
    storageProvider: 'local',
  });
  await SettingService.clearCache(TENANT_ID);
  const keys = await SettingService.getByKeys(TENANT_ID, ['module.storage_local.enabled', 'storageProvider']);
  console.log(`tenant ${TENANT_ID} storage → ${JSON.stringify(keys)}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
