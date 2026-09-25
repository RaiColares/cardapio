import { z } from 'zod';

/**
 * Schemas de validação do módulo de Grupos de Adicionais.
 *
 * O establishmentId NUNCA vem do corpo: é injetado do JWT.
 */

export const createModifierGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome do grupo deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome do grupo deve ter no máximo 100 caracteres.'),
  selectionType: z.enum(['SINGLE', 'MULTIPLE']).default('SINGLE'),
  minSelections: z
    .number()
    .int('O mínimo de seleções deve ser um inteiro.')
    .min(0, 'O mínimo de seleções não pode ser negativo.')
    .max(50, 'O mínimo de seleções não pode ultrapassar 50.')
    .default(0),
  maxSelections: z
    .number()
    .int('O máximo de seleções deve ser um inteiro.')
    .min(1, 'O máximo de seleções deve ser ao menos 1.')
    .max(50, 'O máximo de seleções não pode ultrapassar 50.')
    .optional()
    .nullable(),
  active: z.boolean().default(true),
});

export const updateModifierGroupSchema = createModifierGroupSchema.partial();

export const modifierGroupIdParamSchema = z.object({
  id: z.string().uuid('ID do grupo inválido.'),
});

export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema>;
export type UpdateModifierGroupInput = z.infer<typeof updateModifierGroupSchema>;
