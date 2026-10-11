import type { DashboardMetrics } from '../types/domain.js';
import { api } from './api.js';

/**
 * Parâmetros opcionais do filtro de métricas (FASE 26). Modos EXCLUSIVOS:
 * - nenhum: dia atual (padrão, compatível com o comportamento antigo);
 * - `month` + `year`: mês inteiro (ex.: { month: 9, year: 2026 });
 * - `startDate` + `endDate`: período personalizado (ISO 8601 com offset).
 * O estabelecimento vem do JWT; acesso ADMIN/MANAGER (autorizado no backend).
 */
export interface DashboardMetricsParams {
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
}

/**
 * Métricas do dashboard (GET /dashboard/metrics).
 * Sem parâmetros responde o dia atual; com parâmetros, o backend filtra a
 * receita pelo período (as contagens de mesas/pedidos são sempre o estado
 * atual da operação).
 */
export async function getDashboardMetrics(
  params: DashboardMetricsParams = {},
): Promise<DashboardMetrics> {
  const { data } = await api.get<{ success: true; data: DashboardMetrics }>(
    '/dashboard/metrics',
    { params },
  );
  return data.data;
}