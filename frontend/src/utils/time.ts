/**
 * Formatação relativa de tempo para painéis operacionais.
 * Ex.: "agora", "há 1 min", "há 12 min".
 */
export function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes === 1) return 'há 1 min';
  return `há ${minutes} min`;
}