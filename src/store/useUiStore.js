import { create } from 'zustand';

let toastId = 0;

export const useUiStore = create((set, _get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = ++toastId;
    const entry = {
      id,
      type: toast?.type || 'info',
      message: toast?.message || String(toast || ''),
      ...toast,
    };
    set((s) => ({ toasts: [...s.toasts, entry] }));
    // auto-dismiss
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast?.duration || 4000);
    // also surface via sonner if available
    try {
      import('sonner').then(({ toast: sonner }) => {
        if (entry.type === 'error') sonner.error(entry.message);
        else if (entry.type === 'success') sonner.success(entry.message);
        else sonner(entry.message);
      }).catch(() => {});
    } catch {
      /* ignore */
    }
    return id;
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearToast: () => set({ toasts: [] }),
}));

export default useUiStore;
