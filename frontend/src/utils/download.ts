/**
 * Utilidades de download de arquivos gerados no servidor.
 *
 * O binário chega como Blob (Axios `responseType: 'blob'`); o navegador só
 * materializa o arquivo quando dispara um clique num <a> apontando para um
 * object URL. Este helper mantém esse fluxo num único lugar — Relatórios
 * (CSV de vendas) e Configurações (Backup) compartilham a mesma mecânica.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Extrai o nome do arquivo do header `Content-Disposition` (RFC 6266),
 * priorizando a forma `filename*=UTF-8''…` sobre `filename="…"`.
 *
 * ATENÇÃO (CORS): para o navegador LER este header numa requisição
 * cross-origin, o backend precisa expô-lo via
 * `Access-Control-Expose-Headers: Content-Disposition`. Enquanto não o fizer,
 * o header chega `undefined` e o fallback é usado — aceitável porque o
 * backend define um nome fixo.
 */
export function filenameFromContentDisposition(
  header: string | null | undefined,
  fallback: string,
): string {
  if (!header) return fallback;

  const utf8Match = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    const candidate = utf8Match[1].replace(/["']/g, '').trim();
    if (candidate) {
      try {
        return decodeURIComponent(candidate);
      } catch {
        return candidate;
      }
    }
  }

  const simpleMatch = /filename="?([^";]+)"?/i.exec(header);
  const candidate = simpleMatch?.[1]?.trim();
  if (candidate) return candidate;

  return fallback;
}
