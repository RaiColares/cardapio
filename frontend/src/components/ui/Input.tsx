import type { InputHTMLAttributes } from 'react';

import { cn } from '../../utils/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * Campo de texto com label, dica e mensagem de erro.
 * O id é derivado do name quando não fornecido.
 */
export function Input({
  label,
  hint,
  error,
  id,
  name,
  className,
  ...rest
}: InputProps) {
  const inputId = id ?? name;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-stone-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        className={cn(
          'h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900',
          'placeholder:text-stone-400',
          'transition-colors focus:border-primary-600 focus:outline-2 focus:outline-primary-600/40',
          error && 'border-red-500 focus:border-red-500 focus:outline-red-500/40',
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
