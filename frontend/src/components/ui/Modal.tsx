import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '../../utils/cn.js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Modal acessível: Esc fecha, backdrop fecha, aria-modal + label,
 * bloqueio de scroll do body enquanto aberto.
 * Em mobile vira bottom-sheet (base inferior); em telas maiores centraliza.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-stone-950/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'relative z-10 max-h-[90dvh] w-full animate-scale-in overflow-y-auto rounded-t-3xl bg-white shadow-pop sm:rounded-2xl',
          sizeClasses[size],
        )}
      >
        {title && (
          <header className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h2 id={titleId} className="font-display text-lg text-stone-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-stone-100 px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
