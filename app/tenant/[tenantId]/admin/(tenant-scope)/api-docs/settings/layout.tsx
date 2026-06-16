import { pageTitle } from '@nb/common/server/page-metadata';

export const generateMetadata = pageTitle('API Docs Settings');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
