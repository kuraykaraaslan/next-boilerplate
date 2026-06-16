import { ApiDocsPage } from '@nb/api_doc/ui/api-docs-page.component';
import { SYSTEM_SPEC, TENANT_SPEC } from '@nb/api_doc/ui/mockSpec';
import { isRootTenant } from '@nb/tenant/server/tenant.constants';

/**
 * Tenant admin → API Docs.
 * Root tenant displays the full platform spec (super-admin); other tenants
 * see the tenant-scoped spec.
 */
export default async function TenantAdminApiDocsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const spec = isRootTenant(tenantId) ? SYSTEM_SPEC : TENANT_SPEC;
  return <ApiDocsPage spec={spec} />;
}
