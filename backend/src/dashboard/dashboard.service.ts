import { prisma } from '../common/prisma/prisma.js';

/**
 * Service do Dashboard (métricas do dia + relatório de vendas).
 *
 * Todas as métricas são calculadas em tempo real sobre os dados
 * persistidos (autoridade do servidor) e escopadas pelo
 * establishmentId extraído do JWT (multi-tenancy).
 */

/** Offset de fuso para o "dia atual" (minutos). Default: -180 (UTC-3, Brasil). */
const TZ_OFFSET_MIN = Number(process.env.DASHBOARD_TZ_OFFSET_MIN ?? -180);

/** Início e fim (exclusivo) do dia de hoje no fuso do dashboard, em UTC. */
export function todayRange() {
  const now = new Date(Date.now() + TZ_OFFSET_MIN * 60_000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  const start = new Date(Date.UTC(y, m, d) - TZ_OFFSET_MIN * 60_000);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);

  return { start, end };
}

/** Rótulo do dia (YYYY-MM-DD) no fuso do dashboard. */
function dayLabel(): string {
  const now = new Date(Date.now() + TZ_OFFSET_MIN * 60_000);
  return now.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------
// GET /dashboard/metrics
// ---------------------------------------------------------------

/**
 * Métricas em tempo real do dia atual:
 *
 * - totalRevenueToday: soma dos pagamentos PAID do dia (receita
 *   conciliada — mesma fonte usada no fechamento da comanda);
 * - activeSessionsCount: comandas abertas (não encerradas). A mesa
 *   em BILL_REQUESTED continua com sessão OPEN até o fechamento,
 *   portanto está contabilizada aqui;
 * - pendingOrdersCount: fila da operação (a fazer pela cozinha).
 */
export async function getMetrics(establishmentId: string) {
  const { start, end } = todayRange();

  const [revenue, activeSessions, pendingOrders] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        tableSession: { establishmentId },
        status: 'PAID',
        paidAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
    prisma.tableSession.count({
      where: { establishmentId, status: 'OPEN' },
    }),
    prisma.order.count({
      where: {
        establishmentId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] },
      },
    }),
  ]);

  return {
    date: dayLabel(),
    timezoneOffsetMinutes: TZ_OFFSET_MIN,
    totalRevenueToday: round2(Number(revenue._sum.amount ?? 0)),
    activeSessionsCount: activeSessions,
    pendingOrdersCount: pendingOrders,
  };
}

// ---------------------------------------------------------------
// GET /dashboard/sales?startDate&endDate
// ---------------------------------------------------------------

/**
 * Relatório de vendas: comandas financeiramente liquidadas (CLOSED)
 * dentro do período [startDate, endDate] (ISO 8601, inclusivo).
 *
 * Receita total = soma dos pagamentos PAID das comandas encerradas.
 * `totalBill` é a soma dos totais das comandas (para conferência).
 * Sessions vêm da mais recente para a mais antiga.
 */
export async function getSalesReport(
  establishmentId: string,
  startDate: string,
  endDate: string,
) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const sessions = await prisma.tableSession.findMany({
    where: {
      establishmentId,
      status: 'CLOSED',
      closedAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      openedAt: true,
      closedAt: true,
      table: { select: { id: true, number: true, name: true } },
    },
    orderBy: { closedAt: 'desc' },
  });

  if (sessions.length === 0) {
    return {
      period: { startDate, endDate },
      summary: { sessionsCount: 0, totalRevenue: 0, totalBill: 0 },
      sessions: [],
    };
  }

  const sessionIds = sessions.map((session) => session.id);

  const [orders, paidPayments] = await Promise.all([
    prisma.order.findMany({
      where: {
        establishmentId,
        tableSessionId: { in: sessionIds },
        status: { not: 'CANCELLED' },
      },
      select: { tableSessionId: true, total: true },
    }),
    prisma.payment.findMany({
      where: {
        tableSessionId: { in: sessionIds },
        status: 'PAID',
      },
      select: { tableSessionId: true, amount: true },
    }),
  ]);

  const totalsBySession = new Map<string, number>();
  for (const order of orders) {
    totalsBySession.set(
      order.tableSessionId,
      (totalsBySession.get(order.tableSessionId) ?? 0) + Number(order.total),
    );
  }

  const paidBySession = new Map<string, number>();
  for (const payment of paidPayments) {
    paidBySession.set(
      payment.tableSessionId,
      (paidBySession.get(payment.tableSessionId) ?? 0) + Number(payment.amount),
    );
  }

  const details = sessions.map((session) => {
    const totalBill = round2(totalsBySession.get(session.id) ?? 0);
    const paid = round2(paidBySession.get(session.id) ?? 0);

    return {
      sessionId: session.id,
      tableId: session.table.id,
      tableNumber: session.table.number,
      tableName: session.table.name,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      total: totalBill,
      paidAmount: paid,
      paymentsCount:
        paidPayments.filter((payment) => payment.tableSessionId === session.id)
          .length,
    };
  });

  const totalRevenue = round2(
    details.reduce((sum, session) => sum + session.paidAmount, 0),
  );
  const totalBill = round2(
    details.reduce((sum, session) => sum + session.total, 0),
  );

  return {
    period: { startDate, endDate },
    summary: {
      sessionsCount: sessions.length,
      totalRevenue,
      totalBill,
    },
    sessions: details,
  };
}

// ---------------------------------------------------------------
// GET /dashboard/sales/export?startDate&endDate
// ---------------------------------------------------------------

/**
 * Linha bruta de vendas para exportação CSV: comandas CLOSED do período.
 * `total` = soma dos totais dos pedidos (não cancelados) da comanda;
 * `serviceFee` = soma das taxas de serviço desses pedidos;
 * `paid` = soma dos pagamentos PAID, cujo método é exibido na planilha.
 *
 * Os valores são recalculados pelo servidor a partir dos dados
 * persistidos (o cliente nunca fornece valores financeiros).
 */
export interface SalesExportRow {
  sessionId: string;
  closedAt: Date;
  total: number;
  serviceFee: number;
  paid: number;
}

export async function getSalesExportRows(
  establishmentId: string,
  startDate: string,
  endDate: string,
): Promise<SalesExportRow[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const sessions = await prisma.tableSession.findMany({
    where: {
      establishmentId,
      status: 'CLOSED',
      closedAt: { gte: start, lte: end },
    },
    select: { id: true, closedAt: true },
    orderBy: { closedAt: 'asc' },
  });

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);

  const [orders, paidPayments] = await Promise.all([
    prisma.order.findMany({
      where: {
        establishmentId,
        tableSessionId: { in: sessionIds },
        status: { not: 'CANCELLED' },
      },
      select: { tableSessionId: true, total: true, serviceFee: true },
    }),
    prisma.payment.findMany({
      where: {
        tableSessionId: { in: sessionIds },
        status: 'PAID',
      },
      select: { tableSessionId: true, amount: true },
    }),
  ]);

  const totalsBySession = new Map<string, number>();
  const feesBySession = new Map<string, number>();
  for (const order of orders) {
    totalsBySession.set(
      order.tableSessionId,
      (totalsBySession.get(order.tableSessionId) ?? 0) + Number(order.total),
    );
    feesBySession.set(
      order.tableSessionId,
      (feesBySession.get(order.tableSessionId) ?? 0) + Number(order.serviceFee),
    );
  }

  const paidBySession = new Map<string, number>();
  for (const payment of paidPayments) {
    paidBySession.set(
      payment.tableSessionId,
      (paidBySession.get(payment.tableSessionId) ?? 0) + Number(payment.amount),
    );
  }

  // CLOSED exige closedAt preenchido (invariante de domínio).
  return sessions.map((session) => ({
    sessionId: session.id,
    closedAt: session.closedAt!,
    total: round2(totalsBySession.get(session.id) ?? 0),
    serviceFee: round2(feesBySession.get(session.id) ?? 0),
    paid: round2(paidBySession.get(session.id) ?? 0),
  }));
}
