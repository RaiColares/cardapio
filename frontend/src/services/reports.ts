import type { AuditLogEntry } from '../types/domain.js';
import { api } from './api.js';

/* ------------------------------------------------------------------
 * Relatórios (FASE 20) — exportação CSV de vendas e auditoria.
 * Acesso: ADMIN e MANAGER (autorizado no backend). O establishmentId
 * vem do JWT — nunca dos parâmetros.
 * ------------------------------------------------------------------ */

/** GET /reports/audit — últimas 100 ações do estabelecimento. */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const { data } = await api.get<{ success: true; data: AuditLogEntry[] }>(
    '/reports/audit',
  );
  return data.data;
}

/**
 * GET /dashboard/sales/export?startDate&endDate — CSV de vendas.
 *
 * responseType: 'blob' é obrigatório: o Axios mantém o binário/texto cru e o
 * chamador dispara o download via objectURL (o erro de rede continua
 * normalizado pelo interceptor para ApiError).
 *
 * @param startDate ISO 8601 com offset (ex.: 2026-09-23T00:00:00.000Z)
 * @param endDate   ISO 8601 com offset (ex.: 2026-09-23T23:59:59.999Z)
 */
export async function exportSalesCsv(startDate: string, endDate: string): Promise<Blob> {
  const { data } = await api.get<Blob>('/dashboard/sales/export', {
    params: { startDate, endDate },
    responseType: 'blob',
  });
  return data;
}