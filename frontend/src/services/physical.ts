import type { ApiArea, ApiTable } from '../types/domain.js';
import { api } from './api.js';

/* ------------------------------------------------------------------
 * Áreas
 * ------------------------------------------------------------------ */

export interface AreaPayload {
  name: string;
  description?: string | null;
  active?: boolean;
}

export async function listAreas(): Promise<ApiArea[]> {
  const { data } = await api.get<{ success: true; data: ApiArea[] }>('/areas');
  return data.data;
}

export async function createArea(payload: AreaPayload): Promise<ApiArea> {
  const { data } = await api.post<{ success: true; data: ApiArea }>('/areas', payload);
  return data.data;
}

export async function updateArea(id: string, payload: AreaPayload): Promise<ApiArea> {
  const { data } = await api.put<{ success: true; data: ApiArea }>(`/areas/${id}`, payload);
  return data.data;
}

export async function deleteArea(id: string): Promise<void> {
  await api.delete(`/areas/${id}`);
}

/* ------------------------------------------------------------------
 * Mesas
 * ------------------------------------------------------------------ */

export interface TablePayload {
  number: string;
  name?: string | null;
  capacity: number;
  areaId: string;
  active?: boolean;
}

export async function listTables(): Promise<ApiTable[]> {
  const { data } = await api.get<{ success: true; data: ApiTable[] }>('/tables');
  return data.data;
}

export async function createTable(payload: TablePayload): Promise<ApiTable> {
  const { data } = await api.post<{ success: true; data: ApiTable }>('/tables', payload);
  return data.data;
}

export async function updateTable(id: string, payload: TablePayload): Promise<ApiTable> {
  const { data } = await api.put<{ success: true; data: ApiTable }>(`/tables/${id}`, payload);
  return data.data;
}

export async function deleteTable(id: string): Promise<void> {
  await api.delete(`/tables/${id}`);
}

/**
 * PUT /tables/:id/waiters (FASE 23) — substitui os garçons vinculados.
 *
 * O backend valida que todos os `userIds` são WAITER ativos do mesmo
 * estabelecimento (senão `400 INVALID_WAITER`). Enviar `[]` limpa o vínculo.
 */
export async function setTableWaiters(tableId: string, userIds: string[]): Promise<ApiTable> {
  const { data } = await api.put<{ success: true; data: ApiTable }>(
    `/tables/${tableId}/waiters`,
    { userIds },
  );
  return data.data;
}
