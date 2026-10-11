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

// ---------------------------------------------------------------
// FASE 26 — métricas do dashboard com período flexível
// ---------------------------------------------------------------

/**
 * Query de métricas (GET /dashboard/metrics).
 *
 * Dois modos EXCLUSIVOS entre si:
 * - `startDate` + `endDate`: período exato de dias (ISO 8601 com offset);
 * - `month` + `year`: mês inteiro (numéricos; o backend calcula o primeiro
 *   e o último dia do mês).
 *
 * Nenhum parâmetro = padrão compatível (dia atual). Parâmetros incompletos,
 * misturados ou com ordem inválida de datas são rejeitados (400).
 */
export const metricsQuerySchema = z
  .object({
    startDate: z
      .string('startDate deve ser um texto.')
      .datetime({
        offset: true,
        message: 'startDate deve ser uma data ISO 8601 válida (ex.: 2026-10-01T00:00:00Z).',
      })
      .optional(),
    endDate: z
      .string('endDate deve ser um texto.')
      .datetime({
        offset: true,
        message: 'endDate deve ser uma data ISO 8601 válida (ex.: 2026-10-31T23:59:59Z).',
      })
      .optional(),
    month: z.coerce
      .number('month deve ser um número (1–12).')
      .int('month deve ser um número inteiro.')
      .min(1, 'month deve estar entre 1 e 12.')
      .max(12, 'month deve estar entre 1 e 12.')
      .optional(),
    year: z.coerce
      .number('year deve ser um número.')
      .int('year deve ser um número inteiro.')
      .min(2000, 'year inválido (mínimo 2000).')
      .max(2100, 'year inválido (máximo 2100).')
      .optional(),
  })
  .superRefine((query, ctx) => {
    const anyDay = query.startDate !== undefined || query.endDate !== undefined;
    const anyMonthInfo = query.month !== undefined || query.year !== undefined;

    if (anyDay && anyMonthInfo) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use startDate/endDate OU month/year — não os dois ao mesmo tempo.',
        path: ['startDate'],
      });
      return;
    }

    if (anyDay && (query.startDate === undefined || query.endDate === undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'startDate e endDate devem ser informados juntos.',
        path: query.startDate === undefined ? ['startDate'] : ['endDate'],
      });
      return;
    }

    if (anyMonthInfo && (query.month === undefined || query.year === undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'month e year devem ser informados juntos.',
        path: query.month === undefined ? ['month'] : ['year'],
      });
      return;
    }

    if (
      query.startDate !== undefined &&
      query.endDate !== undefined &&
      new Date(query.startDate) >= new Date(query.endDate)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'startDate deve ser anterior a endDate.',
        path: ['startDate'],
      });
    }
  });

export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;