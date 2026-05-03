import { AdminShell } from '@/modules/app/AdminShell';

export default function SystemFleetLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell variant="system">{children}</AdminShell>;
}
