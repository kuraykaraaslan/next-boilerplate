import { AdminShell } from '@/modules/app/AdminShell';

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell variant="system">
      {children}
    </AdminShell>
  );
}
