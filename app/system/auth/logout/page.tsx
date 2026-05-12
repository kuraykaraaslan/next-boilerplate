'use client';
import { useEffect } from 'react';
import api from '@/modules_next/common/axios';
import { Spinner } from '@/modules_next/common/ui/Spinner';

export default function SystemLogoutPage() {
  useEffect(() => {
    api.post('/system/api/auth/logout').finally(() => {
      window.location.href = '/system/auth/login';
    });
  }, []);

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm p-8 text-center space-y-4">
        <div className="flex justify-center"><Spinner size="lg" /></div>
        <p className="text-sm text-text-secondary">Signing out…</p>
      </div>
    </div>
  );
}
