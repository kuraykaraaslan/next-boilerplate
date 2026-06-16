// Database layer entry point. The implementation is split across focused
// modules — this file re-exports the stable public surface its many callers
// (`@/modules/db`) depend on:
//   • db.entities      — the ENTITIES registry (single source for every @Entity)
//   • db.datasource    — default / read-replica / system DataSources + health
//   • db.tenant        — per-tenant DataSource cache + resolution
//   • db.rls           — transaction wrappers (query timeout, tenant/system RLS)
export { ENTITIES } from './db.entities';
export {
  buildDataSourceOptions,
  getDataSource,
  getReadDataSource,
  getSystemDataSource,
  checkDataSourceHealth,
} from './db.datasource';
export { tenantDataSourceFor, clearTenantDsCache } from './db.tenant';
export { withQueryTimeout, withTenantRLS, withSystemRLS } from './db.rls';
