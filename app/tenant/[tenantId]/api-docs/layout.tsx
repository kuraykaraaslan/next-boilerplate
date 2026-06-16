import { AdminShell } from '@nb/common/ui/layout/admin-shell.component';

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
