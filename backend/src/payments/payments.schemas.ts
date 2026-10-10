import { z } from 'zod';

/**
 * Schemas do módulo de Pagamentos.
 *
 * Pagamentos são SEMPRE atrelados a uma TableSession (comanda).
 * O establishment é validado via sessão + JWT (multi-tenancy).
 *
 * Estrutura pronta para "conta dividida": múltiplos pagamentos por
 * comanda (PIX, cartão, débito, dinheiro), cada um com seu valor,
 * método e status próprios.
 */

export const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'] as const;
export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
] as const;

const amountSchema = z
  .number('O valor deve ser um número.')
  .positive('O valor deve ser um valor positivo.')
  .max(9_999_999.99, 'O valor excede o máximo permitido.')
  .refine((value) => {
    const [, decimals] = String(value).split('.');
    return decimals === undefined || decimals.length <= 2;
  }, {
    message: 'O valor deve ter no máximo 2 casas decimais.',
  });

export const createPaymentSchema = z.object({
  amount: amountSchema,
  method: z.enum(PAYMENT_METHODS).default('CASH'),
  status: z
    .enum(['PENDING', 'PAID'])
    .default('PENDING'),
  paidAt: z
    .string()
    .datetime('Data de pagamento inválida.')
    .optional()
    .nullable(),
});

export const updatePaymentSchema = z.object({
  amount: amountSchema.optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  paidAt: z
    .string()
    .datetime('Data de pagamento inválida.')
    .optional()
    .nullable(),
});

export const paymentIdParamSchema = z.object({
  id: z.string().uuid('ID do pagamento inválido.'),
});

/**
 * PATCH /payments/:id/status — transição de estado da máquina de
 * pagamentos. Somente o status de DESTINO é enviado; o estado atual
 * é lido do banco e validado contra a máquina no service.
 */
export const transitionPaymentStatusSchema = z.object({
  status: z.enum(PAYMENT_STATUSES, {
    message: 'Status de pagamento inválido.',
  }),
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid('ID da sessão inválido.'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type TransitionPaymentStatusInput = z.infer<
  typeof transitionPaymentStatusSchema
>;
