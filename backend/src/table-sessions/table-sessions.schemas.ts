import { z } from 'zod';

/**
 * Schemas do módulo de Comandas (TableSession) e fechamento.
 *
 * - Fluxo público: identificação por sessionToken (UUID imprevisível,
 *   serve como credencial do cliente).
 * - Fluxo privado: identificação por id + establishmentId do JWT.
 */

export const sessionTokenParamsSchema = z.object({
  sessionToken: z
    .string()
    .trim()
    .min(1, 'Token da sessão inválido.')
    .max(191, 'Token da sessão muito longo.'),
});

export const sessionIdParamsSchema = z.object({
  id: z.string().uuid('ID da sessão inválido.'),
});

/**
 * FASE 23 — PATCH /table-sessions/:id/adjustments
 *
 * Ajustes manuais da comanda (desconto/acréscimo/observação). Todos
 * opcionais, mas ao menos um deve ser informado (PATCH não vazio).
 */
export const sessionAdjustmentsSchema = z
  .object({
    discountAmount: z
      .number()
      .nonnegative('O desconto não pode ser negativo.')
      .max(1_000_000, 'Desconto inválido.')
      .optional(),
    extraChargeAmount: z
      .number()
      .nonnegative('O acréscimo não pode ser negativo.')
      .max(1_000_000, 'Acréscimo inválido.')
      .optional(),
    extraChargeNote: z
      .string()
      .trim()
      .max(200, 'A observação deve ter no máximo 200 caracteres.')
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um ajuste (desconto, acréscimo ou observação).',
  });

export type SessionTokenParams = z.infer<typeof sessionTokenParamsSchema>;
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;
export type SessionAdjustmentsInputSchema = z.infer<typeof sessionAdjustmentsSchema>;
