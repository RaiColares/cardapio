import { z } from 'zod';

/**
 * Schemas do fluxo público (sem JWT).
 *
 * O cliente envia SOMENTE identificadores e quantidades.
 * PREÇOS NUNCA vêm do body: o backend busca os preços atuais
 * diretamente no banco (regra de ouro).
 */

export const menuParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Slug inválido.')
    .max(120, 'Slug muito longo.'),
});

export const tableParamsSchema = z.object({
  qrCode: z
    .string()
    .trim()
    .min(1, 'Código da mesa inválido.')
    .max(191, 'Código da mesa muito longo.'),
});

const quantitySchema = z
  .number('Quantidade deve ser um número.')
  .int('Quantidade deve ser um inteiro.')
  .min(1, 'Quantidade mínima é 1.')
  .max(99, 'Quantidade máxima por item é 99.');

const orderItemSchema = z.object({
  productId: z.string().uuid('ID do produto inválido.'),
  modifierIds: z
    .array(z.string().uuid('ID de adicional inválido.'))
    .max(50, 'Limite de 50 adicionais por item.')
    .optional()
    .default([]),
  quantity: quantitySchema,
  notes: z
    .string()
    .trim()
    .max(300, 'Observação muito longa (máx. 300 caracteres).')
    .optional()
    .nullable(),
});

export const createPublicOrderSchema = z
  .object({
    tableSessionToken: z.string().min(1, 'Token da sessão obrigatório.'),
    items: z
      .array(orderItemSchema)
      .min(1, 'O pedido deve conter ao menos 1 item.')
      .max(30, 'Limite de 30 itens por pedido.'),
    notes: z
      .string()
      .trim()
      .max(500, 'Observação muito longa (máx. 500 caracteres).')
      .optional()
      .nullable(),
  })
  // Itens duplicados (mesmo produto+modifiers+quantity) não são abuso,
  // mas mais de 30 itens já é rejeitado acima.
  .refine((data) => data.items.length >= 1, {
    message: 'O pedido deve conter ao menos 1 item.',
  });

export const orderIdParamSchema = z.object({
  id: z.string().uuid('ID do pedido inválido.'),
});

export const sessionTokenParamsSchema = z.object({
  sessionToken: z.string().trim().min(1, 'Token da sessão inválido.').max(191, 'Token da sessão muito longo.'),
});

/** Métodos de pagamento aceitos (espelha o enum PaymentMethod do Prisma). */
export const PAYMENT_METHOD_VALUES = ['CASH', 'CARD', 'PIX'] as const;

/**
 * Valor monetário de troco solicitado: positivo e com no máximo 2 casas
 * decimais (mesma regra dos valores de pagamento).
 */
const changeRequestedSchema = z
  .number('O valor do troco deve ser um número.')
  .positive('O valor do troco deve ser positivo.')
  .max(9_999_999.99, 'O valor do troco excede o máximo permitido.')
  .refine((value) => {
    const [, decimals] = String(value).split('.');
    return decimals === undefined || decimals.length <= 2;
  }, {
    message: 'O troco deve ter no máximo 2 casas decimais.',
  });

/**
 * Body de POST /public/table-sessions/:sessionToken/request-bill.
 * Intenção de pagamento informada pelo cliente ao pedir a conta:
 * - paymentMethodIntent: CASH | CARD | PIX (como será pago);
 * - changeRequested: troco desejado (relevante para CASH).
 * Ambos opcionais; null limpa uma intenção anterior.
 */
export const requestBillBodySchema = z.object({
  paymentMethodIntent: z.enum(PAYMENT_METHOD_VALUES).optional().nullable(),
  changeRequested: changeRequestedSchema.optional().nullable(),
});

export type CreatePublicOrderInput = z.infer<typeof createPublicOrderSchema>;
export type RequestBillBodyInput = z.infer<typeof requestBillBodySchema>;
