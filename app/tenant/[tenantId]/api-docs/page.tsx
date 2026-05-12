import { ApiDocsPage } from '@/modules_next/api_doc/ui/ApiDocsPage';
import { TENANT_SPEC } from '@/modules_next/api_doc/ui/mockSpec';

export default function TenantApiDocsPage() {
  return <ApiDocsPage spec={TENANT_SPEC} />;
}
