import { filenameFromContentDisposition } from '../utils/download.js';
import { api } from './api.js';

/* ------------------------------------------------------------------
 * Exportação de dados (FASE 28) — backup estrutural do estabelecimento.
 * Acesso: ADMIN (o backend responde 403 para os demais papéis). O
 * establishmentId vem do JWT injetado pelo interceptor — nunca dos
 * parâmetros.
 * ------------------------------------------------------------------ */

/** Nome de arquivo padrão do backup (fallback quando o header não é legível). */
export const BACKUP_CSV_FILENAME = 'backup-dados.csv';

export interface BackupExportResult {
  /** Conteúdo do CSV pronto para virar download. */
  blob: Blob;
  /** Nome sugerido do arquivo (header Content-Disposition ou fallback). */
  filename: string;
}

/**
 * GET /export/csv — backup dos dados estruturais do estabelecimento.
 *
 * `responseType: 'blob'` mantém o CSV cru; o interceptor da api continua a
 * normalizar erros de rede/RBAC para ApiError. O nome do arquivo vem do
 * header Content-Disposition quando o backend o expõe via CORS; caso
 * contrário, usa `backup-dados.csv`.
 */
export async function exportBackupCsv(): Promise<BackupExportResult> {
  const response = await api.get<Blob>('/export/csv', { responseType: 'blob' });

  return {
    blob: response.data,
    filename: filenameFromContentDisposition(
      response.headers['content-disposition'],
      BACKUP_CSV_FILENAME,
    ),
  };
}
