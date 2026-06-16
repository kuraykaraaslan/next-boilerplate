import { pageTitle } from '@nb/common/server/page-metadata';

export const generateMetadata = pageTitle('General');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
