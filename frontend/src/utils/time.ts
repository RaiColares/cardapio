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

/** "YYYY-MM-DD" no fuso local do dispositivo (ex.: hoje no operador). */
export function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte "YYYY-MM-DD" (value de input date) em ISO 8601 com offset local.
 * O backend exige datetime com offset (schema `.datetime({ offset: true })`)
 * e compara com colunas em UTC. Usar o fuso do dispositivo preserva o
 * sentido de "dia" para o operador (o balneário gerencia no fuso local).
 * `endOfDay=true` move o instante para 23:59:59.999 (intervalo inclusivo).
 */
export function toIsoLocal(dateInput: string, endOfDay: boolean): string {
  const [yearRaw, monthRaw, dayRaw] = dateInput.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return date.toISOString();
}