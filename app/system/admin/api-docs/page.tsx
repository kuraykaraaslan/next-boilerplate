import { ApiDocsPage } from '@/modules/domains/api-doc/ApiDocsPage';
import { SYSTEM_SPEC } from '@/modules/domains/api-doc/mockSpec';

export default function SystemApiDocsPage() {
  return <ApiDocsPage spec={SYSTEM_SPEC} />;
}
