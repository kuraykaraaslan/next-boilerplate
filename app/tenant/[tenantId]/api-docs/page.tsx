import { ApiDocsPage } from '@/modules_next/api_doc/ui/ApiDocsPage';
import { TENANT_SPEC } from '@/modules_next/api_doc/ui/mockSpec';
import { pageTitle } from '@/modules_next/common/page-metadata';

export const generateMetadata = pageTitle('API Docs');

export default function TenantApiDocsPage() {
  return <ApiDocsPage spec={TENANT_SPEC} />;
}
