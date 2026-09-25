import { randomUUID } from 'node:crypto';

import type { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';

import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type {
  CreatePaymentInput,
  UpdatePaymentInput,
} from './payments.schemas.js';

/**
 * Service do módulo de Pagamentos.
 *
 * Cada Payment pertence a uma TableSession; o tenant é sempre
 * validado através da sessão (via JWT) — nunca pelo corpo/query.
 *
 * FASE 11:
 * - Máquina de estados de pagamentos (PENDING → PAID|FAILED|CANCELLED,
 *   PAID → REFUNDED); transições inválidas → 400 INVALID_PAYMENT_TRANSITION.
 * - Mock de gateway PIX: ao criar pagamento PIX, injetamos um payload
 *   simulado "PIX Copia e Cola" (gatewayTransactionId + gatewayResponse).
 */

export const paymentSelect = {
  id: true,
  tableSessionId: true,
  amount: true,
  method: true,
  status: true,
  gatewayTransactionId: true,
  gatewayResponse: true,
  paidAt: true,
  failedAt: true,
  refundedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PaymentWithSelect = Prisma.PaymentGetPayload<{
  select: typeof paymentSelect;
}>;

/** Serializa Payment para a API (Decimal → number). */
function serializePayment(payment: PaymentWithSelect) {
  return {
    ...payment,
    amount: Number(payment.amount),
  };
}

// ---------------------------------------------------------------
// Máquina de estados de pagamentos
// ---------------------------------------------------------------

/**
 * Transições permitidas da máquina de estados de pagamentos.
 * Estados terminais (FAILED, REFUNDED, CANCELLED) não possuem saída.
 */
const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['REFUNDED'],
  FAILED: [],
  REFUNDED: [],
  CANCELLED: [],
};

const PAYMENT_TRANSITION_LIST = Object.entries(PAYMENT_TRANSITIONS).flatMap(
  ([from, tos]) => tos.map((to) => ({ from: from as PaymentStatus, to })),
);

/** Aplica a data correspondente ao destino da transição. */
function timestampForTransition(target: PaymentStatus) {
  const now = new Date();
  switch (target) {
    case 'PAID': return { paidAt: now };
    case 'FAILED': return { failedAt: now };
    case 'REFUNDED': return { refundedAt: now };
    case 'CANCELLED': return { cancelledAt: now };
    default: return {};
  }
}

/**
 * Valida a transição `from → to` na máquina de estados.
 * Lança 400 INVALID_PAYMENT_TRANSITION se não for permitida.
 */
function assertValidTransition(from: PaymentStatus, to: PaymentStatus) {
  if (from === to) {
    throw new AppError(
      400,
      'INVALID_PAYMENT_TRANSITION',
      `O pagamento já está em "${from}".`,
    );
  }

  const allowed = PAYMENT_TRANSITIONS[from] ?? [];

  if (!allowed.includes(to)) {
    throw new AppError(
      400,
      'INVALID_PAYMENT_TRANSITION',
      `Transição "${from}" → "${to}" não é permitida.`,
    );
  }
}

/** Lista de transições válidas (para documentação/relatórios). */
export const paymentTransitions = PAYMENT_TRANSITION_LIST;

// ---------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------

/** Garante que a sessão pertence ao establishment do JWT. */
async function ensureSessionInTenant(sessionId: string, establishmentId: string) {
  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId, establishmentId },
    select: {
      id: true,
      table: { select: { id: true, number: true } },
      establishment: { select: { id: true, name: true } },
    },
  });

  if (!session) {
    throw new AppError(
      404,
      'SESSION_NOT_FOUND',
      'Sessão da mesa não encontrada.',
    );
  }

  return session;
}

async function ensurePaymentInTenant(paymentId: string, establishmentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, tableSession: { establishmentId } },
    select: { id: true, tableSessionId: true },
  });

  if (!payment) {
    throw new AppError(
      404,
      'PAYMENT_NOT_FOUND',
      'Pagamento não encontrado.',
    );
  }

  return payment;
}

// ---------------------------------------------------------------
// Mock de gateway PIX (integração fictícia)
// ---------------------------------------------------------------

function buildPixGatewayPayload(amount: number, establishmentName: string) {
  // "PIX Copia e Cola" simulado — em produção seria a resposta real
  // do PSP (ex.: qrcode-pix). Estrutura compatível com EMV® QR Code.
  const transactionId = randomUUID();
  const copyPaste = [
    '000201',
    '26580014BR.GOV.BCB.PIX0136',
    transactionId.replaceAll('-', '').toUpperCase(),
    '520400005303986',
    amount.toFixed(2),
    '5802BR',
    '5913',
    establishmentName.slice(0, 13).toUpperCase(),
    '6009SAO PAULO',
    '62070503***',
    '6304',
    'A1B2',
  ].join('');

  return {
    gatewayTransactionId: `PIX-${transactionId}`,
    gatewayProvider: 'mock-pix-gateway',
    copyPaste,
    qrCodeBase64: 'data:image/png;base64,'.concat('iVBORw0KGgoAAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
    emittedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    status: 'CREATED',
  };
}

// ---------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------

/** GET /table-sessions/:id/payments — pagamentos da comanda. */
export async function listSessionPayments(
  sessionId: string,
  establishmentId: string,
) {
  await ensureSessionInTenant(sessionId, establishmentId);

  const payments = await prisma.payment.findMany({
    where: { tableSessionId: sessionId },
    select: paymentSelect,
    orderBy: { createdAt: 'asc' },
  });

  const paidAmount = payments
    .filter((payment) => payment.status === 'PAID')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return {
    sessionId,
    payments: payments.map(serializePayment),
    summary: {
      count: payments.length,
      paidCount: payments.filter((payment) => payment.status === 'PAID').length,
      paidAmount: Math.round(paidAmount * 100) / 100,
    },
  };
}

// ---------------------------------------------------------------
// Criação
// ---------------------------------------------------------------

/**
 * POST /table-sessions/:id/payments
 *
 * Registra um pagamento na comanda (conta dividida).
 * Quando o método é PIX, injeta o payload simulado do gateway
 * (gatewayTransactionId + gatewayResponse "copia e cola").
 */
export async function createPayment(
  sessionId: string,
  input: CreatePaymentInput,
  establishmentId: string,
) {
  const session = await ensureSessionInTenant(sessionId, establishmentId);

  const isPix = input.method === 'PIX';
  const gatewayPayload = isPix
    ? buildPixGatewayPayload(input.amount, session.establishment.name)
    : null;

  const payment = await prisma.payment.create({
    data: {
      tableSessionId: sessionId,
      amount: input.amount,
      method: input.method,
      status: input.status,
      gatewayTransactionId: gatewayPayload?.gatewayTransactionId ?? null,
      gatewayResponse: gatewayPayload
        ? (gatewayPayload as unknown as Prisma.InputJsonValue)
        : undefined,
      paidAt: input.status === 'PAID' && input.paidAt
        ? new Date(input.paidAt)
        : input.status === 'PAID'
          ? new Date()
          : null,
    },
    select: paymentSelect,
  });

  return serializePayment(payment);
}

// ---------------------------------------------------------------
// Transição de status (máquina de estados)
// ---------------------------------------------------------------

/**
 * PATCH /payments/:id/status
 *
 * Transição de status na máquina de estados:
 * - PENDING → PAID | FAILED | CANCELLED
 * - PAID    → REFUNDED
 * - Datas gravadas automaticamente (paidAt/failedAt/refundedAt/cancelledAt).
 */
export async function transitionPaymentStatus(
  paymentId: string,
  target: PaymentStatus,
  establishmentId: string,
) {
  await ensurePaymentInTenant(paymentId, establishmentId);

  const current = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true },
  });

  if (!current) {
    throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Pagamento não encontrado.');
  }

  assertValidTransition(current.status, target);

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: target,
      ...timestampForTransition(target),
    },
    select: paymentSelect,
  });

  return serializePayment(updated);
}

// ---------------------------------------------------------------
// Atualização (dados — amount/method) e transições via máquina
// ---------------------------------------------------------------

/**
 * PATCH /payments/:id
 *
 * Atualiza dados do pagamento. Mudanças de status SEGUEM a mesma
 * máquina de estados (para não burlar as regras pelo endpoint antigo);
 * a data correspondente é aplicada automaticamente.
 */
export async function updatePayment(
  paymentId: string,
  input: UpdatePaymentInput,
  establishmentId: string,
) {
  const payment = await ensurePaymentInTenant(paymentId, establishmentId);

  const data: {
    amount?: number;
    method?: PaymentMethod;
    status?: PaymentStatus;
    paidAt?: Date | null;
  } = {};

  if (input.amount !== undefined) data.amount = input.amount;
  if (input.method !== undefined) data.method = input.method;

  if (input.status !== undefined) {
    const current = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true },
    });

    if (!current) {
      throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Pagamento não encontrado.');
    }

    assertValidTransition(current.status, input.status);

    data.status = input.status;
    Object.assign(data, timestampForTransition(input.status));
  }

  if (input.paidAt !== undefined) {
    data.paidAt = input.paidAt ? new Date(input.paidAt) : null;
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data,
    select: paymentSelect,
  });

  return {
    ...serializePayment(updated),
    tableSessionId: payment.tableSessionId,
  };
}

// ---------------------------------------------------------------
// Exclusão
// ---------------------------------------------------------------

/**
 * DELETE /payments/:id
 *
 * Só permite excluir pagamentos ainda PENDING (lançamento indevido).
 * Pagamentos processados ficam registrados para auditoria — usam
 * CANCELLED/REFUNDED/FAILED em vez de DELETE.
 */
export async function deletePayment(paymentId: string, establishmentId: string) {
  const payment = await ensurePaymentInTenant(paymentId, establishmentId);

  const current = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true },
  });

  if (current && current.status !== 'PENDING') {
    throw new AppError(
      409,
      'PAYMENT_NOT_PENDING',
      'Apenas pagamentos pendentes podem ser excluídos. Use CANCELLED/REFUNDED/FAILED para os demais.',
    );
  }

  await prisma.payment.delete({ where: { id: paymentId } });
}
