export type ClassValue = string | false | null | undefined;

/**
 * Junta classes condicionalmente.
 * Mantido mínimo de propósito — sem dependências externas.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
