import { cn } from '../../utils/cn.js';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Rótulo acessível quando o switch não tem texto visível. */
  'aria-label'?: string;
  id?: string;
  className?: string;
}

/**
 * Interruptor (toggle) do design system.
 * Acessível: role="switch", aria-checked, operável por teclado
 * (Enter/Espaço) e com estado disabled.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
  id,
  className,
}: SwitchProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
        checked ? 'bg-primary-600' : 'bg-stone-300',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-4.5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-1',
        )}
      />
    </button>
  );
}
