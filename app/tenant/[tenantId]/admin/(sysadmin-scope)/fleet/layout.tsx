import { AdminShell } from '@/modules_next/common/ui/layout/AdminShell';
import { pageTitle } from '@/modules_next/common/page-metadata';

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
