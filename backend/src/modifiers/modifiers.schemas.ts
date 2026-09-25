import { z } from 'zod';

/**
 * Schemas de validação do módulo de Adicionais (Modifier).
 *
 * O establishmentId NUNCA vem do corpo: o vínculo com o tenant é
 * garantido pelo modifierGroupId (validado no service) + JWT.
 *
 * Validação financeira: price aceita SOMENTE valores positivos
 * (até 9.999.999,99, compatível com Decimal(10,2)) e no máximo
 * 2 casas decimais (contagem via string, determinística).
 */

const priceSchema = z
  .number('O preço deve ser um número.')
  .positive('O preço deve ser um valor positivo.')
  .max(9_999_999.99, 'O preço excede o valor máximo permitido.')
  .refine((value) => {
    const [, decimals] = String(value).split('.');
    return decimals === undefined || decimals.length <= 2;
  }, {
    message: 'O preço deve ter no máximo 2 casas decimais.',
  });

export const createModifierSchema = z.object({
  modifierGroupId: z.string().uuid('ID do grupo inválido.'),
  name: z
    .string()
    .trim()
    .min(2, 'O nome do adicional deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome do adicional deve ter no máximo 100 caracteres.'),
  price: priceSchema,
  active: z.boolean().default(true),
});

export const updateModifierSchema = createModifierSchema.partial();

export const modifierIdParamSchema = z.object({
  id: z.string().uuid('ID do adicional inválido.'),
});

export const listModifiersQuerySchema = z.object({
  modifierGroupId: z.string().uuid('ID do grupo inválido.').optional(),
  active: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type CreateModifierInput = z.infer<typeof createModifierSchema>;
export type UpdateModifierInput = z.infer<typeof updateModifierSchema>;
