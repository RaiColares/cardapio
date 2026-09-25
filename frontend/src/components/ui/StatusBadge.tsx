import type { OrderStatus, TableStatus } from '../../types/domain.js';
import { Badge } from './Badge.js';

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Novo',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const tableStatusLabel: Record<TableStatus, string> = {
  AVAILABLE: 'Livre',
  OCCUPIED: 'Ocupada',
  NEW_ORDER: 'Novo pedido',
  PREPARING: 'Preparando',
  READY: 'Pronto',
  BILL_REQUESTED: 'Conta solicitada',
};

const orderStatusVariant: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'primary',
  READY: 'success',
  DELIVERED: 'neutral',
  CANCELLED: 'danger',
};

const tableStatusVariant: Record<TableStatus, BadgeVariant> = {
  AVAILABLE: 'success',
  OCCUPIED: 'neutral',
  NEW_ORDER: 'warning',
  PREPARING: 'primary',
  READY: 'success',
  BILL_REQUESTED: 'danger',
};

/**
 * Badge de status acompanhado de texto — nunca dependemos só de cor.
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={orderStatusVariant[status]}>{orderStatusLabel[status]}</Badge>;
}

export function TableStatusBadge({ status }: { status: TableStatus }) {
  return <Badge variant={tableStatusVariant[status]}>{tableStatusLabel[status]}</Badge>;
}
