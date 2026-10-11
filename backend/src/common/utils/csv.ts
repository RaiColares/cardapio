/**
 * Utilitários de serialização CSV.
 *
 * Convenção única do projeto (nasceu na FASE 22 para a exportação de
 * vendas e é reutilizada pela exportação de backup em `/export/csv`):
 *
 * - **Delimitador `;`** — compatibilidade nativa com o Excel na
 *   configuração brasileira (decimal com vírgula + separador de coluna `;`);
 * - **Escape RFC 4180 adaptado** — campos que contenham `;`, aspas ou
 *   quebra de linha são envolvidos em aspas duplas e as aspas internas são
 *   dobradas;
 * - **BOM UTF-8 (`\uFEFF`)** prefixa o documento para o Excel abrir a
 *   acentuação corretamente;
 * - **Linhas com CRLF** (`\r\n`).
 *
 * Centralizar aqui evita que cada exportação reinvente (e divirja) o
 * escape — o formato do arquivo é um contrato com o cliente.
 */

/** Delimitador de coluna padrão (Excel pt-BR). */
export const CSV_DELIMITER = ';';

/** BOM UTF-8 (marca de ordem de bytes) exigido pelo Excel para acentos. */
export const UTF8_BOM = '\uFEFF';

/**
 * Escapa uma célula para o formato CSV do projeto.
 *
 * Apenas envolve em aspas quando necessário (campo "sujo"), dobrando as
 * aspas internas — mantém o arquivo legível e compatível com o Excel.
 */
export function escapeCsv(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Monta um documento CSV a partir de uma matriz de células.
 *
 * - Cada linha é uma array de strings (células);
 * - Uma linha vazia (`[]`) vira uma linha em branco — usada para separar
 *   seções na exportação de backup;
 * - O documento sai com BOM UTF-8 e linhas unidas por CRLF.
 */
export function buildCsv(rows: readonly (readonly string[])[]): string {
  const body = rows
    .map((cells) => cells.map(escapeCsv).join(CSV_DELIMITER))
    .join('\r\n');

  return `${UTF8_BOM}${body}`;
}
