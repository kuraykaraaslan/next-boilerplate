import { AdminShell } from '@/modules_next/common/ui/layout/AdminShell';

export default async function TenantApiDocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <AdminShell tenantId={tenantId}>
      {children}
    </AdminShell>
  );
}
