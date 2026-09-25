import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

import { cn } from '../../utils/cn.js';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  showToast: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, { icon: typeof Info; ring: string }> = {
  success: { icon: CheckCircle2, ring: 'text-green-700' },
  error: { icon: AlertTriangle, ring: 'text-red-600' },
  info: { icon: Info, ring: 'text-aqua-700' },
};

/**
 * Feedback leve de ações (ex.: "adicionado ao carrinho").
 * Estado local de UI — renderizado no canto inferior.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, message: string): void => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, variant, message }]);

      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const { icon: Icon, ring } = variantStyles[toast.variant];

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-pop"
              role={toast.variant === 'error' ? 'alert' : 'status'}
            >
              <Icon className={cn('size-5 shrink-0', ring)} aria-hidden="true" />
              <p className="flex-1 text-sm font-medium text-stone-800">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dispensar"
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  }

  return context;
}
