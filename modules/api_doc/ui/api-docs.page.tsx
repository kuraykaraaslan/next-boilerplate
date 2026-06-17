'use client';
import { use } from 'react';
import { ApiDocsPage } from '@kuraykaraaslan/api_doc/ui/api-docs-page.component';
import { SYSTEM_SPEC, TENANT_SPEC } from '@kuraykaraaslan/api_doc/ui/mockSpec';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';

/**
 * Tenant admin → API Docs.
 * Root tenant displays the full platform spec (super-admin); other tenants
 * see the tenant-scoped spec.
 */
export default function TenantAdminApiDocsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  const spec = isRootTenant(tenantId) ? SYSTEM_SPEC : TENANT_SPEC;
  return <ApiDocsPage spec={spec} />;
}
