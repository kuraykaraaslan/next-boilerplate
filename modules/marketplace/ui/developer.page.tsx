'use client';
import { use } from 'react';
import { DeveloperPage } from '@kuraykaraaslan/marketplace/ui/developer-page.component';

export default function AdminDeveloperPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <DeveloperPage tenantId={tenantId} />;
}
