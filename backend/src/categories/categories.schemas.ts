import { z } from 'zod';

/**
 * Schemas de validação do módulo de Categorias.
 *
 * O establishmentId NUNCA vem do corpo: é injetado do JWT.
 */

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome da categoria deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome da categoria deve ter no máximo 100 caracteres.'),
  description: z
    .string()
    .trim()
    .max(255, 'A descrição deve ter no máximo 255 caracteres.')
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .trim()
    .url('URL de imagem inválida.')
    .max(500, 'URL de imagem muito longa.')
    .optional()
    .nullable(),
  icon: z
    .string()
    .trim()
    .max(50, 'O ícone deve ter no máximo 50 caracteres.')
    .optional()
    .nullable(),
  displayOrder: z
    .number()
    .int('O displayOrder deve ser um inteiro.')
    .min(0, 'O displayOrder não pode ser negativo.')
    .max(9999, 'O displayOrder deve ser no máximo 9999.')
    .optional(),
  active: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = z.object({
  id: z.string().uuid('ID da categoria inválido.'),
});

/**
 * Validação da query de listagem.
 * Permite ordenar por displayOrder (default: displayOrder crescente).
 */
export const listCategoriesQuerySchema = z.object({
  orderBy: z.enum(['displayOrder', 'name', 'createdAt']).default('displayOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
