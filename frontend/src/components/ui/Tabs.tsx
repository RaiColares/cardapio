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
  /**
   * Quando true, as abas mantêm a largura do conteúdo e a lista passa a rolar
   * horizontalmente em vez de comprimir os rótulos. Útil quando há muitas abas
   * (ex.: uma por categoria). O padrão (false) mantém as abas dividindo a
   * largura igualmente.
   */
  scrollable?: boolean;
}

/**
 * Abas acessíveis com navegação por teclado (setas ←/→).
 * O conteúdo do painel é renderizado pelo chamador.
 */
export function Tabs({ items, value, onChange, ariaLabel, className, scrollable = false }: TabsProps) {
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
      className={cn(
        'flex gap-1 rounded-xl bg-sand-100 p-1',
        scrollable && 'overflow-x-auto',
        className,
      )}
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
              'flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
              scrollable ? 'shrink-0 whitespace-nowrap' : 'flex-1',
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
