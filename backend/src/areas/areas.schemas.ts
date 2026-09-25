import { z } from 'zod';

/**
 * Schemas de validação do módulo de Áreas.
 *
 * Nenhum campo de estabelecimento é aceito no corpo: o
 * establishmentId SEMPRE vem do JWT (multi-tenancy).
 */

export const createAreaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome da área deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome da área deve ter no máximo 100 caracteres.'),
  description: z
    .string()
    .trim()
    .max(255, 'A descrição deve ter no máximo 255 caracteres.')
    .optional()
    .nullable(),
  active: z.boolean().optional(),
});

export const updateAreaSchema = createAreaSchema.partial();

export const areaIdParamSchema = z.object({
  id: z.string().uuid('ID da área inválido.'),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
