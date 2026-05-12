import { AdminShell } from '@/modules_next/common/ui/layout/AdminShell';

export default function SystemFleetLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell variant="system">{children}</AdminShell>;
}
