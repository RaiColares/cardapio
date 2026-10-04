import { api } from './api.js';

import type {
  CreatePaymentInput,
  Payment,
  PaymentRemovalResult,
  SessionAdjustmentsInput,
  SessionBill,
} from '../types/domain.js';

/**
 * Contratos privados (WAITER/MANAGER/ADMIN) de comanda e pagamentos.
 * O fechamento valida no servidor (pedidos abertos + pagamento integral).
 */

/** GET /table-sessions/:id/bill — resumo financeiro da comanda. */
export async function getSessionBill(sessionId: string): Promise<SessionBill> {
  const { data } = await api.get(`/table-sessions/${sessionId}/bill`);
  return data.data as SessionBill;
}

/** GET /table-sessions/:id/payments — pagamentos registrados da comanda.
 *  Contrato: { sessionId, payments: Payment[], summary }. */
export async function getSessionPayments(sessionId: string): Promise<Payment[]> {
  const { data } = await api.get(`/table-sessions/${sessionId}/payments`);
  return (data.data as { payments: Payment[] }).payments;
}

/** POST /table-sessions/:id/payments — registra pagamento parcial/total. */
export async function createPayment(
  sessionId: string,
  input: CreatePaymentInput,
): Promise<Payment> {
  const { data } = await api.post(`/table-sessions/${sessionId}/payments`, input);
  return data.data as Payment;
}

/** POST /table-sessions/:id/close — fechamento atômico da comanda. */
export async function closeSession(sessionId: string) {
  const { data } = await api.post(`/table-sessions/${sessionId}/close`);
  return data.data;
}

/**
 * DELETE /payments/:id — estorno de pagamento (FASE 23).
 *
 * Restrito a MANAGER/ADMIN no backend. Remove o pagamento (mesmo já PAID)
 * e devolve o saldo recalculado da comanda associada.
 */
export async function deletePayment(paymentId: string): Promise<PaymentRemovalResult> {
  const { data } = await api.delete(`/payments/${paymentId}`);
  return data.data as PaymentRemovalResult;
}

/**
 * PATCH /table-sessions/:id/adjustments — ajustes manuais da comanda
 * (desconto/acréscimo/observação). O backend recalcula o bill e devolve-o
 * atualizado, de modo que o total exibido nunca é calculado no frontend.
 */
export async function updateSessionAdjustments(
  sessionId: string,
  input: SessionAdjustmentsInput,
): Promise<SessionBill> {
  const { data } = await api.patch(`/table-sessions/${sessionId}/adjustments`, input);
  return data.data as SessionBill;
}
