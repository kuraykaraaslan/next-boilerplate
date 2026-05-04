import { ApiDocsPage } from '@/modules/api_doc/ui/ApiDocsPage';
import { SYSTEM_SPEC } from '@/modules/api_doc/ui/mockSpec';

export default function SystemApiDocsPage() {
  return <ApiDocsPage spec={SYSTEM_SPEC} />;
}
