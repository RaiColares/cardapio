import { Loader2 } from 'lucide-react';

import { cn } from '../../utils/cn.js';

export interface LoadingProps {
  label?: string;
  className?: string;
}

/**
 * Indicador de carregamento central (estado loading de páginas/ações).
 */
export function Loading({ label = 'Carregando…', className }: LoadingProps) {
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-2 py-10 text-stone-500', className)}
    >
      <Loader2 className="size-6 animate-spin text-primary-700" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
