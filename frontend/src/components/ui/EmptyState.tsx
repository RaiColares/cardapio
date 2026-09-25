import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Estado vazio consistente (ex.: nenhum produto na categoria).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-sand-100">
        <Icon className="size-7 text-stone-400" aria-hidden="true" />
      </div>
      <h3 className="mt-1 font-display text-lg text-stone-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-stone-500">{description}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
