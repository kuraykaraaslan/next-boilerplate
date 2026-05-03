import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Next Boilerplate',
  description: 'Multi-tenant SaaS boilerplate',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-base text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
