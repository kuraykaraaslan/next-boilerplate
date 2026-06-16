import { AdminShell } from '@nb/common/ui/layout/admin-shell.component';
import { pageTitle } from '@nb/common/server/page-metadata';

export const generateMetadata = pageTitle('Fleet');

export default async function PlatformFleetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <AdminShell tenantId={tenantId}>{children}</AdminShell>;
}
