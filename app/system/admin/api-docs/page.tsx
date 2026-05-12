import { ApiDocsPage } from '@/modules_next/api_doc/ui/ApiDocsPage';
import { SYSTEM_SPEC } from '@/modules_next/api_doc/ui/mockSpec';

export default function SystemApiDocsPage() {
  return <ApiDocsPage spec={SYSTEM_SPEC} />;
}
