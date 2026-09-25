import type { DashboardMetrics } from '../types/domain.js';
import { api } from './api.js';

/**
 * Métricas do dashboard (GET /dashboard/metrics).
 * Estabelecimento vem do JWT; acesso ADMIN/MANAGER (autorizado no backend).
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { data } = await api.get<{ success: true; data: DashboardMetrics }>(
    '/dashboard/metrics',
  );
  return data.data;
}
