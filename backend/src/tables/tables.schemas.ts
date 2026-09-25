import { z } from 'zod';

/**
 * Schemas de validação do módulo de Mesas.
 *
 * Regras:
 *  - number: identificador da mesa dentro do estabelecimento.
 *    É texto (ex.: "12", "A3"). Rejeitamos valores numéricos
 *    negativos e strings vazias.
 *  - capacity: mínimo 1.
 *  - areaId: UUID válido (a área é validada no service quanto ao tenant).
 *
 * O establishmentId NUNCA vem do corpo: é injetado do JWT.
 */

const mesaNumberSchema = z
  .string()
  .trim()
  .min(1, 'O número da mesa é obrigatório.')
  .max(20, 'O número da mesa deve ter no máximo 20 caracteres.')
  .refine((value) => !/^-\d+$/.test(value), {
    message: 'O número da mesa não pode ser negativo.',
  });

export const createTableSchema = z.object({
  number: mesaNumberSchema,
  name: z
    .string()
    .trim()
    .max(50, 'O nome da mesa deve ter no máximo 50 caracteres.')
    .optional()
    .nullable(),
  capacity: z
    .number()
    .int('A capacidade deve ser um número inteiro.')
    .min(1, 'A capacidade deve ser no mínimo 1.')
    .max(100, 'A capacidade deve ser no máximo 100.'),
  areaId: z.string().uuid('ID da área inválido.'),
  active: z.boolean().optional(),
});

export const updateTableSchema = createTableSchema.partial();

export const tableIdParamSchema = z.object({
  id: z.string().uuid('ID da mesa inválido.'),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
