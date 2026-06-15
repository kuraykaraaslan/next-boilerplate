import { AdminShell } from '@/modules_next/common/ui/layout/AdminShell';
import { pageTitle } from '@/modules_next/common/page-metadata';

// Title for the admin index; nested route layouts set their own.
export const generateMetadata = pageTitle('Dashboard');

export default async function TenantAdminLayout({
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
