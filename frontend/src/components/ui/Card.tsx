import type { HTMLAttributes } from 'react';

import { cn } from '../../utils/cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

/**
 * Superfície padrão do design system.
 */
export function Card({ padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-stone-200/70 bg-white shadow-card',
        padded && 'p-4',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
