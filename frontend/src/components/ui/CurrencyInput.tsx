import { useEffect, useId, useState } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * Converte centavos (inteiro) em texto com máscara pt-BR: 123456 → "1.234,56".
 */
function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte um valor em reais (string, ex.: "1234.56") para centavos inteiros. */
function rawToCents(raw: string): number {
  if (!raw) {
    return 0;
  }
  const [reais = '0', centavos = '00'] = raw.split('.');
  const reaisInt = Number(reais || '0');
  const centsInt = Number((centavos || '00').padEnd(2, '0').slice(0, 2));
  return reaisInt * 100 + centsInt;
}

/** Converte centavos em valor em reais como string ("1234.56") ou "" quando zero. */
function centsToRaw(cents: number): string {
  return cents > 0 ? (cents / 100).toFixed(2) : '';
}

/** Máximo aceito na digitação: 9.999.999,99 (limite do backend). */
const MAX_DIGITS = 11;

export interface CurrencyInputProps {
  /** Valor em reais como string ("1234.56") — para integração com React Hook Form. */
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  'aria-describedby'?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Campo monetário com máscara automática em Reais (pt-BR).
 *
 * - Exibe o valor formatado ("1.234,56") com prefixo fixo "R$";
 * - Guarda o valor em reais como string ("1234.56") para o formulário;
 * - Aceita apenas dígitos; vírgula/ponto são gerados pela máscara;
 * - inputMode="decimal" ativa o teclado numérico no celular.
 */
export function CurrencyInput({
  value,
  onValueChange,
  id,
  label,
  hint,
  error,
  placeholder = '0,00',
  autoFocus = false,
  disabled = false,
}: CurrencyInputProps) {
  const inputId = id ?? useId();
  const [display, setDisplay] = useState(() =>
    value ? centsToDisplay(rawToCents(value)) : '',
  );

  // Sincroniza a máscara quando o valor muda externamente (ex.: reset).
  useEffect(() => {
    setDisplay(value ? centsToDisplay(rawToCents(value)) : '');
  }, [value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const digits = event.currentTarget.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (digits.length > MAX_DIGITS) {
      return;
    }
    const cents = Number(digits || '0');
    setDisplay(centsToDisplay(cents));
    onValueChange(centsToRaw(cents));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-stone-700">
          {label}
        </label>
      )}
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-stone-400"
        >
          R$
        </span>
        <input
          id={inputId}
          name="currency"
          role="textbox"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 text-base text-stone-900',
            'placeholder:text-stone-400',
            'transition-colors focus:border-primary-600 focus:outline-2 focus:outline-primary-600/40',
            error && 'border-red-500 focus:border-red-500 focus:outline-red-500/40',
          )}
        />
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