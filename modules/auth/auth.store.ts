'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SafeUser } from '@/modules/user/user.types';

interface AuthStore {
  user: SafeUser | null;
  setUser: (user: SafeUser | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set): AuthStore => ({
      user: null,
      setUser: (user: SafeUser | null) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    { name: 'auth-storage' },
  ),
);
