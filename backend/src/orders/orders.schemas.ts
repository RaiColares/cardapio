import { z } from 'zod';

/**
 * Schemas do módulo de operação de Pedidos (painéis da cozinha e garçom).
 *
 * O establishmentId NUNCA vem do corpo: é injetado do JWT.
 */

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED',
] as const;

// Status operacionais "vivos" (fila de trabalho).
export const ACTIVE_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
] as const;

const statusParamSchema = z.enum(ORDER_STATUSES);

/**
 * Transições permitidas pela máquina de estados.
 *
 * Apenas um passo por vez (sem saltos):
 * PENDING → CONFIRMED → PREPARING → READY → DELIVERED
 * Qualquer estado "vivo" pode ir para CANCELLED; estados
 * terminais (DELIVERED, CANCELLED) não aceitam transição.
 */
export const STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const listOrdersQuerySchema = z.object({
  status: z
    .union([statusParamSchema, z.array(statusParamSchema)])
    .optional(),
  // "Grupo" de status utilitário para a cozinha/garçom.
  scope: z
    .enum(['ACTIVE'])
    .optional(),
  tableId: z.string().uuid('ID da mesa inválido.').optional(),
  tableSessionId: z.string().uuid('ID da sessão inválido.').optional(),
  orderBy: z.enum(['createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const updateOrderStatusSchema = z.object({
  status: statusParamSchema,
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('ID do pedido inválido.'),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
