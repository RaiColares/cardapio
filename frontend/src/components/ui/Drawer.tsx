import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '../../utils/cn.js';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  placement?: 'right' | 'bottom';
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Painel lateral/bottom-sheet acessível.
 * Mobile-first: `bottom` cobre o uso de bottom sheet no cardápio.
 */
export function Drawer({
  open,
  onClose,
  title,
  placement = 'bottom',
  children,
  footer,
}: DrawerProps) {
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

  const isBottom = placement === 'bottom';

  return (
    <div className="fixed inset-0 z-50" role="presentation">
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
          'absolute z-10 flex flex-col bg-white shadow-pop',
          isBottom
            ? 'inset-x-0 bottom-0 max-h-[85dvh] animate-slide-up rounded-t-3xl'
            : 'inset-y-0 right-0 w-full max-w-sm animate-slide-in-right rounded-l-2xl',
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
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-stone-100 px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
