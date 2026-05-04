'use client';
import { ThemeProvider } from 'next-themes';
import { ToastContainer } from '@/modules/ui/ToastContainer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <ToastContainer />
    </ThemeProvider>
  );
}
