import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import { cn } from '../../utils/cn.js';

export interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Abas acessíveis com navegação por teclado (setas ←/→).
 * O conteúdo do painel é renderizado pelo chamador.
 */
export function Tabs({ items, value, onChange, ariaLabel, className }: TabsProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + items.length) % items.length;
    const next = items[nextIndex];

    if (next) {
      onChange(next.value);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex gap-1 rounded-xl bg-sand-100 p-1', className)}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        const Icon = item.icon;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
              selected
                ? 'bg-white text-primary-800 shadow-sm'
                : 'text-stone-600 hover:text-stone-900',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
