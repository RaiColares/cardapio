import type { Order, OrderStatus, Prisma, TableSession } from '@prisma/client';

import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import {
  emitToEstablishment,
  emitToRoom,
  sessionRoom,
} from '../realtime/socket.js';

/**
 * Service de Comandas (TableSession): solicitação de conta, resumo
 * (bill), fechamento da sessão e comprovante (receipt).
 *
 * REGRA DE OURO: valores NUNCA são calculados no cliente — o backend
 * recalcula tudo a partir dos pedidos persistidos (snapshots).
 *
 * FASE 11:
 * - Conciliação no fechamento: só fecha comanda cujo total esteja
 *   coberto pela soma dos pagamentos PAID (INSUFFICIENT_PAYMENT);
 * - Receipt (comprovante) privado + público com consolidação estática.
 */

const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
];

const sessionWithContextSelect = {
  id: true,
  sessionToken: true,
  status: true,
  openedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  table: {
    select: {
      id: true,
      number: true,
      name: true,
      status: true,
      qrCode: true,
      area: { select: { id: true, name: true } },
    },
  },
  establishment: {
    select: {
      id: true,
      name: true,
      status: true,
      phone: true,
      whatsapp: true,
      address: true,
      city: true,
      state: true,
      serviceFeeEnabled: true,
      serviceFeeRate: true,
    },
  },
} as const;

type SessionWithContext = Prisma.TableSessionGetPayload<{
  select: typeof sessionWithContextSelect;
}>;

type OrderLite = Order & {
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
    modifiers: Array<{
      modifierName: string;
      price: Prisma.Decimal;
      quantity: number;
    }>;
  }>;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Normaliza valores decimais do Prisma para number. */
function serializeSession(session: SessionWithContext) {
  return {
    id: session.id,
    sessionToken: session.sessionToken,
    status: session.status,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    table: { ...session.table, number: session.table.number },
    establishment: {
      ...session.establishment,
      serviceFeeRate: Number(session.establishment.serviceFeeRate),
    },
  };
}

async function findSessionByToken(sessionToken: string) {
  const session = await prisma.tableSession.findFirst({
    where: { sessionToken },
    select: sessionWithContextSelect,
  });

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sessão da mesa não encontrada.');
  }

  if (session.status !== 'OPEN') {
    throw new AppError(409, 'SESSION_CLOSED', 'A sessão desta mesa está encerrada.');
  }

  return session;
}

/** Busca por token sem restrição de status (usado no comprovante público). */
async function findSessionByTokenAnyStatus(sessionToken: string) {
  const session = await prisma.tableSession.findFirst({
    where: { sessionToken },
    select: sessionWithContextSelect,
  });

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sessão da mesa não encontrada.');
  }

  return session;
}

async function findSessionById(id: string, establishmentId: string) {
  const session = await prisma.tableSession.findFirst({
    where: { id, establishmentId },
    select: sessionWithContextSelect,
  });

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sessão da mesa não encontrada.');
  }

  return session;
}

// ---------------------------------------------------------------
// Cálculo do bill (reutilizado por bill, close e receipt)
// ---------------------------------------------------------------

/** Agrupa os pedidos da sessão para o cálculo do bill. */
async function fetchSessionOrders(tableSessionId: string): Promise<OrderLite[]> {
  return prisma.order.findMany({
    where: { tableSessionId },
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
      items: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          modifiers: {
            select: { modifierName: true, price: true, quantity: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { orderNumber: 'asc' },
  }) as unknown as Promise<OrderLite[]>;
}

/**
 * Calcula o resumo financeiro da comanda (autoridade do servidor):
 * - Ignora pedidos CANCELLED;
 * - Subtotal = Σ subtotais dos pedidos válidos;
 * - Taxa de serviço aplicada sobre o subtotal (se habilitada);
 * - Total = subtotal − discount + taxa.
 */
function computeBill(session: SessionWithContext, orders: OrderLite[]) {
  const activeOrders = orders.filter((order) => order.status !== 'CANCELLED');

  // Itens para o detalhamento (sem itens de pedidos cancelados).
  const items = activeOrders.flatMap((order) =>
    order.items.map((item) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      modifiers: item.modifiers.map((modifier) => ({
        modifierName: modifier.modifierName,
        price: Number(modifier.price),
        quantity: modifier.quantity,
      })),
    })),
  );

  const subtotal = round2(
    activeOrders.reduce((sum, order) => sum + Number(order.subtotal), 0),
  );
  const discount = round2(
    activeOrders.reduce((sum, order) => sum + Number(order.discount), 0),
  );

  const serviceFeeEnabled = session.establishment.serviceFeeEnabled;
  const serviceFeeRate = Number(session.establishment.serviceFeeRate ?? 0);
  const serviceFee = serviceFeeEnabled ? round2(subtotal * (serviceFeeRate / 100)) : 0;

  const total = round2(subtotal - discount + serviceFee);

  return {
    summary: {
      ordersCount: activeOrders.length,
      itemsCount: items.length,
      subtotal,
      discount,
      serviceFee,
      serviceFeeRate: serviceFeeEnabled ? serviceFeeRate : 0,
      total,
    },
    items,
    activeOrders,
  };
}

/** Soma dos pagamentos PAID da comanda (centavos exatos). */
async function sumPaidPayments(tableSessionId: string) {
  const paid = await prisma.payment.findMany({
    where: { tableSessionId, status: 'PAID' },
    select: { amount: true },
  });

  return {
    paidAmount: round2(
      paid.reduce((sum, payment) => sum + Number(payment.amount), 0),
    ),
    paidCount: paid.length,
  };
}

// ---------------------------------------------------------------
// Solicitação de conta (público)
// ---------------------------------------------------------------

/** Dados de intenção de pagamento enviados pelo cliente no request-bill. */
export interface RequestBillInput {
  paymentMethodIntent?: string | null;
  changeRequested?: number | null;
}

/**
 * POST /public/table-sessions/:sessionToken/request-bill
 *
 * O cliente da mesa pede a conta. A mesa vai para BILL_REQUESTED
 * (chamando o garçom) e o evento é emitido para os painéis.
 *
 * FASE 22: a intenção de pagamento (paymentMethodIntent) e o troco
 * solicitado (changeRequested) informados no body são persistidos na
 * comanda e repassados no evento BILL_REQUESTED (painéis + cliente),
 * para que o garçom já chegue preparado para o fechamento.
 */
export async function requestBill(sessionToken: string, input: RequestBillInput = {}) {
  const session = await findSessionByToken(sessionToken);

  // Persiste a intenção de pagamento + troco na comanda (Prisma aceita number
  // direto para campos Decimal). Valores ausentes/null limpam a intenção.
  const updatedSession = await prisma.tableSession.update({
    where: { id: session.id },
    data: {
      paymentMethodIntent: input.paymentMethodIntent ?? null,
      changeRequested: input.changeRequested ?? null,
    },
    select: {
      id: true,
      paymentMethodIntent: true,
      changeRequested: true,
    },
  });

  // Altera a mesa para BILL_REQUESTED (notifica os garçons/painéis).
  const table = await prisma.table.update({
    where: { id: session.table.id },
    data: { status: 'BILL_REQUESTED' },
    select: { id: true, number: true, status: true },
  });

  const payload = {
    sessionId: session.id,
    tableId: session.table.id,
    tableNumber: session.table.number,
    tableName: session.table.name,
    tableStatus: table.status,
    paymentMethodIntent: updatedSession.paymentMethodIntent ?? null,
    changeRequested:
      updatedSession.changeRequested != null
        ? Number(updatedSession.changeRequested)
        : null,
    requestedAt: new Date().toISOString(),
  };

  // Painéis do estabelecimento (garçons/ADMIN/MANAGER).
  emitToEstablishment(session.establishment.id, 'BILL_REQUESTED', payload);

  // Mesa/comanda específica (cliente) — confirmação.
  emitToRoom(sessionRoom(session.id), 'BILL_REQUESTED', payload);

  return {
    success: true,
    ...payload,
  };
}

// ---------------------------------------------------------------
// Resumo da comanda (privado — WAITER/MANAGER/ADMIN)
// ---------------------------------------------------------------

/**
 * GET /table-sessions/:id/bill
 *
 * Resumo financeiro da comanda para fechamento (cálculo no servidor).
 */
export async function getSessionBill(id: string, establishmentId: string) {
  const session = await findSessionById(id, establishmentId);

  const orders = await fetchSessionOrders(id);
  const { summary, items, activeOrders } = computeBill(session, orders);

  return {
    session: serializeSession(session),
    establishment: {
      id: session.establishment.id,
      name: session.establishment.name,
      serviceFeeEnabled: session.establishment.serviceFeeEnabled,
      serviceFeeRate: Number(session.establishment.serviceFeeRate ?? 0),
    },
    summary,
    orders: activeOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      serviceFee: Number(order.serviceFee),
      total: Number(order.total),
      notes: order.notes,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        modifiers: item.modifiers.map((modifier) => ({
          modifierName: modifier.modifierName,
          price: Number(modifier.price),
          quantity: modifier.quantity,
        })),
      })),
    })),
    items,
  };
}

// ---------------------------------------------------------------
// Fechamento da sessão (privado — WAITER/MANAGER/ADMIN)
// ---------------------------------------------------------------

/**
 * POST /table-sessions/:id/close
 *
 * Fechamento atômico da comanda:
 * - TRAVA 1: pedidos em aberto (PENDING, CONFIRMED, PREPARING, READY)
 *   impedem o fechamento → 400 SESSION_HAS_OPEN_ORDERS;
 * - TRAVA 2 (FASE 11): a soma dos pagamentos PAID deve cobrir o TOTAL
 *   da comanda (taxa de serviço incluída) → 400 INSUFFICIENT_PAYMENT
 *   com o valor faltante (missingAmount);
 * - TableSession → CLOSED + closedAt; Table → AVAILABLE;
 * - Evento SESSION_CLOSED (painéis + mesa/comanda).
 *
 * REGRA DE OURO: todas as escritas em UMA transação ($transaction).
 */
export async function closeSession(id: string, establishmentId: string) {
  const session = await findSessionById(id, establishmentId);

  if (session.status === 'CLOSED') {
    throw new AppError(409, 'SESSION_ALREADY_CLOSED', 'A sessão já está encerrada.');
  }

  // Trava 1 — segurança: pedidos em aberto impedem o fechamento.
  const openOrdersCount = await prisma.order.count({
    where: {
      tableSessionId: id,
      status: { in: OPEN_ORDER_STATUSES },
    },
  });

  if (openOrdersCount > 0) {
    throw new AppError(
      400,
      'SESSION_HAS_OPEN_ORDERS',
      'Não é possível fechar a comanda: existem pedidos ainda não finalizados.',
    );
  }

  // Trava 2 — conciliação financeira: pagamentos PAID >= total do bill.
  const orders = await fetchSessionOrders(id);
  const { summary } = computeBill(session, orders);
  const total = summary.total;

  const { paidAmount } = await sumPaidPayments(id);

  const totalCents = Math.round(total * 100);
  const paidCents = Math.round(paidAmount * 100);

  if (paidCents < totalCents) {
    throw new AppError(
      400,
      'INSUFFICIENT_PAYMENT',
      'Pagamento insuficiente para o fechamento da comanda.',
      {
        total,
        paidAmount,
        missingAmount: round2((totalCents - paidCents) / 100),
      },
    );
  }

  // Fechamento atômico: sessão CLOSED + mesa AVAILABLE em uma transação.
  const [closedSession] = await prisma.$transaction([
    prisma.tableSession.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      select: {
        id: true,
        sessionToken: true,
        status: true,
        closedAt: true,
        table: { select: { id: true, number: true } },
      },
    }),
    prisma.table.update({
      where: { id: session.table.id },
      data: { status: 'AVAILABLE' },
      select: { id: true, number: true, status: true },
    }),
  ]);

  const payload = {
    sessionId: closedSession.id,
    sessionToken: closedSession.sessionToken,
    status: closedSession.status,
    closedAt: closedSession.closedAt,
    tableId: closedSession.table.id,
    tableNumber: closedSession.table.number,
    tableStatus: 'AVAILABLE',
  };

  // Painéis do estabelecimento + mesa/comanda específica.
  emitToEstablishment(establishmentId, 'SESSION_CLOSED', payload);
  emitToRoom(sessionRoom(id), 'SESSION_CLOSED', payload);
  emitToRoom(`room_table_${session.table.id}`, 'SESSION_CLOSED', payload);

  return {
    success: true,
    ...payload,
    summary,
  };
}

// ---------------------------------------------------------------
// Comprovante (Receipt)
// ---------------------------------------------------------------

/** Consolida itens iguais (mesmo produto/variante/preço/adicionais). */
function consolidateItems(items: ReturnType<typeof computeBill>['items']) {
  const consolidated = new Map<string, {
    productName: string;
    variantName: string | null;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    modifiers: Array<{ modifierName: string; price: number; quantity: number }>;
  }>();

  for (const item of items) {
    const modifierKey = item.modifiers
      .map((m) => `${m.modifierName}:${m.price}`)
      .sort()
      .join('|');
    const key = `${item.productName}::${item.variantName ?? ''}::${item.unitPrice}::${modifierKey}`;

    const existing = consolidated.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      existing.totalPrice = round2(existing.totalPrice + item.totalPrice);
    } else {
      consolidated.set(key, {
        productName: item.productName,
        variantName: item.variantName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        modifiers: item.modifiers,
      });
    }
  }

  return [...consolidated.values()];
}

/** Monta o comprovante estático (snapshot) da comanda. */
async function buildReceipt(session: SessionWithContext) {
  const orders = await fetchSessionOrders(session.id);
  const { summary, items } = computeBill(session, orders);

  const payments = await prisma.payment.findMany({
    where: { tableSessionId: session.id, status: 'PAID' },
    select: {
      id: true,
      method: true,
      amount: true,
      status: true,
      paidAt: true,
      gatewayTransactionId: true,
    },
    orderBy: { paidAt: 'asc' },
  });

  const paidAmount = round2(
    payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
  );
  const remaining = round2(summary.total - paidAmount);

  return {
    receiptId: session.id,
    emittedAt: new Date().toISOString(),
    session: {
      id: session.id,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
    },
    establishment: {
      id: session.establishment.id,
      name: session.establishment.name,
      phone: session.establishment.phone ?? null,
      whatsapp: session.establishment.whatsapp ?? null,
      address: session.establishment.address ?? null,
      city: session.establishment.city ?? null,
      state: session.establishment.state ?? null,
    },
    table: {
      id: session.table.id,
      number: session.table.number,
      name: session.table.name,
      area: session.table.area?.name ?? null,
    },
    summary: {
      ordersCount: summary.ordersCount,
      itemsCount: summary.itemsCount,
      subtotal: summary.subtotal,
      serviceFeeRate: summary.serviceFeeRate,
      serviceFee: summary.serviceFee,
      total: summary.total,
    },
    items: consolidateItems(items),
    payments: payments.map((payment) => ({
      id: payment.id,
      method: payment.method,
      amount: Number(payment.amount),
      status: payment.status,
      paidAt: payment.paidAt,
      gatewayTransactionId: payment.gatewayTransactionId,
    })),
    totals: {
      total: summary.total,
      paidAmount,
      remaining,
      settled: remaining <= 0.004,
    },
  };
}

/**
 * GET /table-sessions/:id/receipt (privado)
 * Comprovante não-oficial consolidado da comanda.
 */
export async function getSessionReceipt(id: string, establishmentId: string) {
  const session = await findSessionById(id, establishmentId);
  const receipt = await buildReceipt(session);
  return receipt;
}

/**
 * GET /public/table-sessions/:sessionToken/receipt (público)
 * Comprovante consultável pelo cliente (não exige JWT).
 * Funciona também após o fechamento (CLOSED) — é o comprovante final.
 */
export async function getPublicSessionReceipt(sessionToken: string) {
  const session = await findSessionByTokenAnyStatus(sessionToken);
  const receipt = await buildReceipt(session);
  return receipt;
}
