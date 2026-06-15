import { pageTitle } from '@/modules_next/common/page-metadata';

export const generateMetadata = pageTitle('Signing Out');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
