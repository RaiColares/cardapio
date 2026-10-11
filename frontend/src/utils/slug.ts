/**
 * Geração de slugs amigáveis para URLs (UX do cadastro).
 *
 * Ex.: "Balneário Praia Azul" → "balneario-praia-azul"
 *
 * Apenas apresentação/UX — o backend valida o formato e continua sendo a
 * autoridade sobre o slug (regex `^[a-z0-9]+(-[a-z0-9]+)*$`).
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // espaços e símbolos → hífen
    .replace(/^-+|-+$/g, ''); // remove hífens das bordas
}