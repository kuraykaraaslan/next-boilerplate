import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import FontAwesomeConfig from '@/modules_next/common/ui/layout/FontAwesomeConfig';
import { SkipToContent } from '@/modules_next/common/ui/SkipToContent';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Next Boilerplate',
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
        </Providers>
      </body>
    </html>
  );
}
