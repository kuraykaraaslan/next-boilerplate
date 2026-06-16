'use client';
import { ThemeProvider } from 'next-themes';
import { ToastContainer } from '@nb/common/ui/toast-container.component';
import { useEffect } from 'react';

function AxeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      import('@axe-core/react').then(({ default: axe }) => {
        const React = require('react');
        const ReactDOM = require('react-dom');
        axe(React, ReactDOM, 1000);
      });
    }
  }, []);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AxeProvider>
        {children}
        <ToastContainer />
      </AxeProvider>
    </ThemeProvider>
  );
}
