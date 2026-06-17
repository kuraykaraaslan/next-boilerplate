'use client';
import { use } from 'react';
import { ModuleManagerPage } from '@kuraykaraaslan/setting/ui/module-manager-page.component';

export default function AdminModulesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <ModuleManagerPage tenantId={tenantId} />;
}
