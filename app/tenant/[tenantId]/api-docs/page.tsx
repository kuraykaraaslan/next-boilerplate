'use client';

import { useParams } from 'next/navigation';
import { SwaggerDocs } from '@/components/common/swagger';

export default function TenantApiDocsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <SwaggerDocs
      specUrl="/assets/openapi-tenant.json"
      title="Tenant API"
      homeUrl={`/tenant/${tenantId}`}
      loginUrl={`/tenant/${tenantId}/auth/login`}
      badgeText="Tenant API"
    />
  );
}
