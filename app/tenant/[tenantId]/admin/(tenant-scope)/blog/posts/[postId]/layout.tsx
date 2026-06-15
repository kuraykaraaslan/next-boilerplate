import { pageTitle } from '@/modules_next/common/page-metadata';

export const generateMetadata = pageTitle('Edit Post');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
