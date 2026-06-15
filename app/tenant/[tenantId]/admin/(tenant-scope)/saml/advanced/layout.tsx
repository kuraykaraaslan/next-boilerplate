import { pageTitle } from '@/modules_next/common/page-metadata';

export const generateMetadata = pageTitle('SAML Advanced');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
