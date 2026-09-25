import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';

/**
 * Rastreio público do pedido pelo cliente.
 *
 * Exposição mínima: status, itens (snapshots) e valores. Nenhum dado
 * interno (estabelecimento, sessão, token, dados de pagamento) é
 * exposto. O ID (UUID) funciona como credencial de acesso do pedido.
 */
/** Arredonda valores monetários para 2 casas (evita 61.489999…). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getPublicOrderById(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
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
          number: true,
          name: true,
        },
      },
      items: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          notes: true,
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
    },
  });

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    table: { number: order.table.number, name: order.table.name },
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    serviceFee: Number(order.serviceFee),
    total: Number(order.total),
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      notes: item.notes,
      modifiers: item.modifiers.map((modifier) => ({
        id: modifier.id,
        modifierName: modifier.modifierName,
        price: Number(modifier.price),
        quantity: modifier.quantity,
      })),
    })),
  };
}

// ---------------------------------------------------------------
// Extrato da comanda (todos os pedidos da sessão)
// ---------------------------------------------------------------

/**
 * GET /api/v1/public/table-sessions/:sessionToken/orders
 *
 * Extrato completo da comanda: todos os pedidos da sessão (exceto
 * cancelados) com itens, variantes e adicionais (snapshots) e status
 * atual. O sessionToken é a credencial de acesso — nenhum dado interno
 * (estabelecimento, IDs de recursos do tenant) é exposto.
 *
 * Sessões encerradas continuam legíveis (o cliente pode conferir a
 * conta após o fechamento); apenas pedidos CANCELLED são omitidos.
 */
export async function getPublicSessionOrders(sessionToken: string) {
  const session = await prisma.tableSession.findFirst({
    where: { sessionToken },
    select: {
      id: true,
      status: true,
      table: { select: { id: true, number: true, name: true } },
    },
  });

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sessão da mesa não encontrada.');
  }

  const orders = await prisma.order.findMany({
    where: {
      tableSessionId: session.id,
      status: { not: 'CANCELLED' },
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
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
    },
  });

  return {
    sessionId: session.id,
    sessionStatus: session.status,
    table: {
      id: session.table.id,
      number: session.table.number,
      name: session.table.name,
    },
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      serviceFee: Number(order.serviceFee),
      total: Number(order.total),
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        notes: item.notes,
        modifiers: item.modifiers.map((modifier) => ({
          id: modifier.id,
          modifierName: modifier.modifierName,
          price: Number(modifier.price),
          quantity: modifier.quantity,
        })),
      })),
    })),
    summary: orders.reduce(
      (acc, order) => ({
        subtotal: round2(acc.subtotal + Number(order.subtotal)),
        discount: round2(acc.discount + Number(order.discount)),
        serviceFee: round2(acc.serviceFee + Number(order.serviceFee)),
        total: round2(acc.total + Number(order.total)),
      }),
      { subtotal: 0, discount: 0, serviceFee: 0, total: 0 },
    ),
  };
}
