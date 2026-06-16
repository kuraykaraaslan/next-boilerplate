import { pageTitle } from '@nb/common/server/page-metadata';

export const generateMetadata = pageTitle('Audit Log Settings');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
