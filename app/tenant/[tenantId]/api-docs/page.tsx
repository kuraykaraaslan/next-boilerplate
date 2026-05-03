import { ApiDocsPage } from '@/modules/domains/api-doc/ApiDocsPage';
import { TENANT_SPEC } from '@/modules/domains/api-doc/mockSpec';

export default function TenantApiDocsPage() {
  return <ApiDocsPage spec={TENANT_SPEC} />;
}
