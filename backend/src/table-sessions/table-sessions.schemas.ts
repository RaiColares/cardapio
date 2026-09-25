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

export type SessionTokenParams = z.infer<typeof sessionTokenParamsSchema>;
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;
