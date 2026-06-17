import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import FontAwesomeConfig from '@kuraykaraaslan/common/ui/layout/font-awesome-config.component';
import { SkipToContent } from '@kuraykaraaslan/common/ui/skip-to-content.component';
import { DemoModeNotice } from '@kuraykaraaslan/common/ui/demo-mode-notice.component';
import { DEFAULT_APP_NAME } from '@kuraykaraaslan/common/server/page-metadata';
import { env } from '@kuraykaraaslan/env';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: DEFAULT_APP_NAME,
    template: `%s | ${DEFAULT_APP_NAME}`,
  },
  description: 'Multi-tenant SaaS boilerplate',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-surface-base text-text-primary antialiased font-sans">
        <SkipToContent />
        <FontAwesomeConfig />
        <Providers>
          <main id="main-content">{children}</main>
          {env.DEMO_MODE && <DemoModeNotice />}
        </Providers>
      </body>
    </html>
  );
}
