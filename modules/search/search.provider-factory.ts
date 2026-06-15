import SearchProviderBase from './providers/base.provider';
import PostgresSearchProvider from './providers/postgres.provider';

// The only provider today is PostgreSQL FTS, which is stateless (it resolves the
// tenant DataSource per call), so a single shared instance is reused.
let instance: SearchProviderBase | null = null;

/**
 * Resolve the active search provider. Stateless across tenants — the provider
 * scopes every operation by the `tenantId` argument. Adding a backend means a
 * new case here keyed on a tenant/global setting.
 */
export function getSearchProvider(): SearchProviderBase {
  if (!instance) instance = new PostgresSearchProvider();
  return instance;
}
