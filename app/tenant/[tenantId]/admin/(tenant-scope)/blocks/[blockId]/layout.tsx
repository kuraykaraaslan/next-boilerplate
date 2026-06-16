import { pageTitle } from '@nb/common/server/page-metadata';

export const generateMetadata = pageTitle('Edit Block');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
