import { api } from './api.js';

import type { OperationalOrder, OrderStatus } from '../types/domain.js';

/**
 * Contratos privados (JWT) de operação de Pedidos.
 * RBAC fino das transições é do backend (orders.service.ts).
 */

export interface ListOrdersParams {
  /** Um ou mais status (or). */
  status?: OrderStatus[];
  /** scope=ACTIVE → fila viva (PENDING, CONFIRMED, PREPARING, READY). */
  scope?: 'ACTIVE';
  tableId?: string;
  tableSessionId?: string;
  orderBy?: 'createdAt';
  order?: 'asc' | 'desc';
}

/** GET /orders — lista pedidos operacionais do estabelecimento. */
export async function listOrders(params: ListOrdersParams = {}): Promise<OperationalOrder[]> {
  // O backend espera status como keys repetidas (status=PENDING&status=READY),
  // não como status[]=... — desativamos os colchetes nesta serialização.
  const { data } = await api.get('/orders', {
    params,
    paramsSerializer: { indexes: null },
  });
  return data.data as OperationalOrder[];
}

/** GET /orders/:id — detalhe de um pedido. */
export async function getOrder(orderId: string): Promise<OperationalOrder> {
  const { data } = await api.get(`/orders/${orderId}`);
  return data.data as OperationalOrder;
}

/** PATCH /orders/:id/status — transição permitida (máquina de estados + RBAC). */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<OperationalOrder> {
  const { data } = await api.patch(`/orders/${orderId}/status`, { status });
  return data.data as OperationalOrder;
}
