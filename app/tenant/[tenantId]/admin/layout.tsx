import { AdminShell } from '@nb/common/ui/layout/AdminShell';
import { pageTitle } from '@nb/common/server/page-metadata';

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
