import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { cn } from '../../utils/cn.js';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantConfig: Record<AlertVariant, { icon: typeof Info; classes: string; iconClasses: string }> = {
  info: {
    icon: Info,
    classes: 'border-aqua-200 bg-aqua-50 text-aqua-900',
    iconClasses: 'text-aqua-700',
  },
  success: {
    icon: CheckCircle2,
    classes: 'border-green-200 bg-green-50 text-green-900',
    iconClasses: 'text-green-700',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-200 bg-amber-50 text-amber-900',
    iconClasses: 'text-amber-700',
  },
  danger: {
    icon: XCircle,
    classes: 'border-red-200 bg-red-50 text-red-900',
    iconClasses: 'text-red-700',
  },
};

/**
 * Alerta de contexto. danger/warning usam role="alert"; os demais
 * são anunciados de forma educada (aria-live="polite").
 */
export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  const isAlert = variant === 'danger' || variant === 'warning';

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 text-sm',
        config.classes,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', config.iconClasses)} aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && 'mt-0.5')}>{children}</div>
      </div>
    </div>
  );
}
