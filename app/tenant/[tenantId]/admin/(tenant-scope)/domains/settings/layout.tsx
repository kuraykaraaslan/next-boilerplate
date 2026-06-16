import { pageTitle } from '@nb/common/server/page-metadata';

export const generateMetadata = pageTitle('Domain Settings');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
