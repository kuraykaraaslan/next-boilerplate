import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
};

type ToastStore = {
  toasts: Toast[];
  add: (message: string, variant: ToastVariant, duration?: number) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, variant, duration = 4000) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id: crypto.randomUUID(), message, variant, duration },
      ],
    })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  error:   (msg: string) => useToastStore.getState().add(msg, 'error'),
  warning: (msg: string) => useToastStore.getState().add(msg, 'warning'),
  info:    (msg: string) => useToastStore.getState().add(msg, 'info'),
};
