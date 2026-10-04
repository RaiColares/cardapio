import type { Prisma, UserRole } from '@prisma/client';

import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import {
  orderVisibilityWhere,
  waiterIdsOf,
  type AuthContext,
} from '../common/visibility/table-visibility.js';
import { emitToRoom, emitToTableAudience } from '../realtime/socket.js';
import { ACTIVE_ORDER_STATUSES, STATUS_TRANSITIONS } from './orders.schemas.js';
import type {
  ListOrdersQueryInput,
  UpdateOrderStatusInput,
} from './orders.schemas.js';

/**
 * Service de operação de Pedidos (cozinha/garçom).
 *
 * O establishmentId sempre vem do JWT; o pedido é sempre validado
 * contra o tenant antes de qualquer operação (multi-tenancy).
 */

export const orderOperationalSelect = {
  id: true,
  orderNumber: true,
  status: true,
  subtotal: true,
  discount: true,
  serviceFee: true,
  total: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  table: {
    select: {
      id: true,
      number: true,
      name: true,
      area: { select: { id: true, name: true } },
    },
  },
  tableSession: {
    select: {
      id: true,
      status: true,
    },
  },
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      variantName: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      notes: true,
      createdAt: true,
      modifiers: {
        select: {
          id: true,
          modifierName: true,
          price: true,
          quantity: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} as const;

export type OrderOperationalSelect = typeof orderOperationalSelect;

type OrderWithItems = Prisma.OrderGetPayload<{
  select: typeof orderOperationalSelect;
}>;

function normalizeOrder(order: OrderWithItems) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    serviceFee: Number(order.serviceFee),
    total: Number(order.total),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      modifiers: item.modifiers.map((modifier) => ({
        ...modifier,
        price: Number(modifier.price),
      })),
    })),
  };
}

/**
 * Lista pedidos operacionais do estabelecimento.
 *
 * Filtros:
 * - status: um ou múltiplos (ex.: ?status=PENDING&status=CONFIRMED);
 * - scope=ACTIVE: fila viva (PENDING, CONFIRMED, PREPARING, READY);
 * - tableId / tableSessionId: pedidos de uma mesa/comanda;
 * - orderBy=createdAt (asc = fila por ordem de chegada).
 *
 * FASE 22 — Visão Global de Pedidos:
 * - ADMIN e MANAGER, sem filtro de status, recebem TODOS os pedidos do
 *   estabelecimento, independentemente do status (inclui DELIVERED e
 *   CANCELLED) — visão gerencial completa;
 * - WAITER e KITCHEN, sem filtro, recebem por padrão a fila viva +
 *   DELIVERED (pedidos de comandas abertas), nunca CANCELLED.
 */
export async function listOperationalOrders(
  establishmentId: string,
  query: ListOrdersQueryInput,
  viewer: AuthContext,
) {
  const { role } = viewer;
  const where: Record<string, unknown> = { establishmentId };

  let statuses: string[] | undefined;
  if (query.status) {
    statuses = Array.isArray(query.status) ? query.status : [query.status];
  } else if (query.scope === 'ACTIVE') {
    statuses = [...ACTIVE_ORDER_STATUSES];
  } else if (role === 'WAITER' || role === 'KITCHEN') {
    // Operação: fila viva + entregues (nunca cancela vaza para a operação).
    statuses = [...ACTIVE_ORDER_STATUSES, 'DELIVERED'];
  }
  // ADMIN/MANAGER sem filtro → sem restrição de status (visão global).

  if (statuses) {
    where.status = { in: statuses };
  }

  if (query.tableId) {
    where.tableId = query.tableId;
  }

  if (query.tableSessionId) {
    where.tableSessionId = query.tableSessionId;
  }

  // FASE 23 — visibilidade por garçom (mesas atribuídas).
  Object.assign(where, orderVisibilityWhere(viewer));

  const orders = await prisma.order.findMany({
    where,
    select: orderOperationalSelect,
    orderBy: { [query.orderBy]: query.order },
  });

  return orders.map(normalizeOrder);
}

/** Busca um pedido do tenant (para leitura detalhada). */
export async function getOperationalOrderById(
  orderId: string,
  establishmentId: string,
  viewer?: AuthContext,
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      establishmentId,
      ...(viewer ? orderVisibilityWhere(viewer) : {}),
    },
    select: orderOperationalSelect,
  });

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
  }

  return normalizeOrder(order);
}

/** Roles permitidas por tipo de transição (RBAC da operação). */
const ROLE_BY_TRANSITION: Record<string, UserRole[]> = {
  CONFIRMED: ['WAITER', 'MANAGER', 'ADMIN'],
  PREPARING: ['KITCHEN', 'MANAGER', 'ADMIN'],
  READY: ['KITCHEN', 'MANAGER', 'ADMIN'],
  DELIVERED: ['WAITER', 'MANAGER', 'ADMIN'],
  CANCELLED: ['WAITER', 'MANAGER', 'ADMIN'],
};

/**
 * Transição de status com máquina de estados + RBAC.
 *
 * 1. Pedido pertence ao tenant (JWT).
 * 2. Transição deve ser um passo válido (sem saltos).
 * 3. Role do usuário deve ser autorizada para o status de destino.
 * 4. Persiste + emite evento ORDER_STATUS_UPDATED nas salas
 *    do estabelecimento E da mesa específica.
 */
export async function updateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput,
  viewer: AuthContext,
) {
  const { establishmentId, role } = viewer;

  const order = await prisma.order.findFirst({
    where: { id: orderId, establishmentId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      tableId: true,
      tableSessionId: true,
      establishmentId: true,
      table: {
        select: { waiters: { select: { id: true } } },
      },
    },
  });

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
  }

  // FASE 23 — garçom só opera pedidos de mesas sem vínculo ou vinculadas
  // a ele. Mesa atribuída a outro garçom → 403.
  const assignedWaiterIds = waiterIdsOf(order.table?.waiters);
  if (
    role === 'WAITER' &&
    assignedWaiterIds.length > 0 &&
    !assignedWaiterIds.includes(viewer.userId)
  ) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Esta mesa está atribuída a outro garçom.',
    );
  }

  const current = order.status;
  const target = input.status;

  // Máquina de estados: apenas passos válidos, sem saltos.
  const allowed = STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(target)) {
    const message =
      target === current
        ? `O pedido já está em ${current}.`
        : `Transição inválida de ${current} para ${target}.`;
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', message);
  }

  // RBAC da transição (por status de destino).
  const allowedRoles = ROLE_BY_TRANSITION[target] ?? [];
  if (!allowedRoles.includes(role)) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Sua função não tem permissão para esta transição de status.',
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: target },
    select: orderOperationalSelect,
  });

  const payload = normalizeOrder(updated);

  // Realtime: respeita os garçons atribuídos à mesa. Mesa sem vínculo
  // continua indo para a sala geral do estabelecimento; mesa atribuída
  // vai apenas para os garçons dela + equipe privilegiada.
  emitToTableAudience(establishmentId, assignedWaiterIds, 'ORDER_STATUS_UPDATED', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    previousStatus: current,
    status: target,
    tableId: order.tableId,
    tableSessionId: order.tableSessionId,
    updatedAt: updated.updatedAt,
    order: payload,
  });

  emitToRoom(`room_table_${order.tableId}`, 'ORDER_STATUS_UPDATED', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    previousStatus: current,
    status: target,
    tableId: order.tableId,
    tableSessionId: order.tableSessionId,
    updatedAt: updated.updatedAt,
  });

  return payload;
}
