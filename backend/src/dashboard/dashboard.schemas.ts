import { z } from 'zod';

/**
 * Schemas do módulo de Dashboard (métricas e relatório de vendas).
 *
 * Acesso restrito a MANAGER e ADMIN. O establishmentId vem do JWT
 * (multi-tenancy) — nunca dos query params.
 */

/** Período do relatório de vendas — ISO 8601 (com ou sem timezone). */
export const salesQuerySchema = z.object({
  startDate: z
    .string({ message: 'startDate é obrigatório.' })
    .datetime({
      offset: true,
      message: 'startDate deve ser uma data ISO 8601 válida (ex.: 2026-09-23T00:00:00Z).',
    }),
  endDate: z
    .string({ message: 'endDate é obrigatório.' })
    .datetime({
      offset: true,
      message: 'endDate deve ser uma data ISO 8601 válida (ex.: 2026-09-23T23:59:59Z).',
    }),
});

export type SalesQueryInput = z.infer<typeof salesQuerySchema>;
