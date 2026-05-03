import { AdminShell } from '@/modules/app/AdminShell';

export default function SystemApiDocsLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell variant="system">{children}</AdminShell>;
}
