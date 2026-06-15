import { pageTitle } from '@/modules_next/common/page-metadata';

export const generateMetadata = pageTitle('API Docs Settings');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
