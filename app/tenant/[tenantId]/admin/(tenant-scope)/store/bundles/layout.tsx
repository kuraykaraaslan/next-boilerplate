import { pageTitle } from '@/modules_next/common/page-metadata';

export const generateMetadata = pageTitle('Bundles');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
