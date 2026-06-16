import { use } from 'react';
import { ModuleManagerPage } from '@nb/setting/ui/ModuleManagerPage';

export default function AdminModulesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <ModuleManagerPage tenantId={tenantId} />;
}
