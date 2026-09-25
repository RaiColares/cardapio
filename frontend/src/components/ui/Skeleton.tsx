import { cn } from '../../utils/cn.js';

export interface SkeletonProps {
  className?: string;
}

/**
 * Placeholder de carregamento (estado loading de blocos).
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-xl bg-stone-200/80', className)}
    />
  );
}
