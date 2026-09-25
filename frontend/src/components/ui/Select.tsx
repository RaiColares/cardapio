import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../../utils/cn.js';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

/**
 * Select nativo estilizado (acessível e sem dependências).
 */
export function Select({
  label,
  options,
  error,
  id,
  name,
  className,
  ...rest
}: SelectProps) {
  const selectId = id ?? name;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-stone-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border border-stone-300 bg-white px-3 pr-10 text-base text-stone-900',
            'transition-colors focus:border-primary-600 focus:outline-2 focus:outline-primary-600/40',
            error && 'border-red-500',
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-stone-500"
          aria-hidden="true"
        />
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
