import type { ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-stone-200 text-stone-700',
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-aqua-100 text-aqua-800',
  outline: 'border border-stone-300 bg-white text-stone-700',
};

/**
 * Rótulo de status/categoria. Usar sempre acompanhado de texto —
 * nunca depender apenas de cor.
 */
export function Badge({
  variant = 'neutral',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
