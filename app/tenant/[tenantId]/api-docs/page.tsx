import { ApiDocsPage } from '@nb/api_doc/ui/ApiDocsPage';
import { TENANT_SPEC } from '@nb/api_doc/ui/mockSpec';
import { pageTitle } from '@nb/common/server/page-metadata';

export const generateMetadata = pageTitle('API Docs');

export default function TenantApiDocsPage() {
  return <ApiDocsPage spec={TENANT_SPEC} />;
}
