import { AdminShell } from '@/modules/ui/layout/AdminShell';

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell variant="system">
      {children}
    </AdminShell>
  );
}
