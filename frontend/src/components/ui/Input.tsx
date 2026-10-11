import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

import { cn } from '../../utils/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * Campo de texto com label, dica e mensagem de erro.
 * O id é derivado do name quando não fornecido.
 *
 * Quando `type="password"`, exibe um botão de "olho" que alterna a
 * visibilidade (password ↔ text). O botão é `type="button"` para nunca
 * submeter o formulário e traz `aria-label` dinâmico; fica acessível por
 * teclado como qualquer controle.
 */
export function Input({
  label,
  hint,
  error,
  id,
  name,
  className,
  type,
  disabled,
  ...rest
}: InputProps) {
  const inputId = id ?? name;
  const isPassword = type === 'password';
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const resolvedType = isPassword && passwordRevealed ? 'text' : type;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-stone-700">
          {label}
        </label>
      )}
      <div className={cn(isPassword && 'relative')}>
        <input
          id={inputId}
          name={name}
          type={resolvedType}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            'h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900',
            'placeholder:text-stone-400',
            'transition-colors focus:border-primary-600 focus:outline-2 focus:outline-primary-600/40',
            error && 'border-red-500 focus:border-red-500 focus:outline-red-500/40',
            isPassword && 'pr-11',
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordRevealed((current) => !current)}
            disabled={disabled}
            aria-label={passwordRevealed ? 'Ocultar senha' : 'Mostrar senha'}
            title={passwordRevealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={passwordRevealed}
            className={cn(
              'absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-stone-400',
              'hover:text-stone-700',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
              'disabled:opacity-50',
            )}
          >
            {passwordRevealed ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
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
