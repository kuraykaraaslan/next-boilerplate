import { AdminShell } from '@/modules/app/AdminShell';

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <AdminShell variant="tenant" tenantId={tenantId}>
      {children}
    </AdminShell>
  );
}
