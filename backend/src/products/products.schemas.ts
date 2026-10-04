import { z } from 'zod';

/**
 * Schemas de validação do módulo de Produtos.
 *
 * Validações financeiras: price e promotionalPrice aceitam SOMENTE
 * valores positivos (até 9.999.999,99, compatível com Decimal(10,2)).
 *
 * O establishmentId NUNCA vem do corpo: é injetado do JWT.
 * O categoryId é validado no service quanto ao tenant.
 */

// Máximo suportado por Decimal(10,2).
const priceSchema = z
  .number('Preço deve ser um número.')
  .positive('O preço deve ser um valor positivo.')
  .max(9_999_999.99, 'O preço excede o valor máximo permitido.')
  // garante no máximo 2 casas decimais (precisão monetária);
  // contagem via string é determinística (evita imprecisão de float)
  .refine((value) => {
    const [, decimals] = String(value).split('.');
    return decimals === undefined || decimals.length <= 2;
  }, {
    message: 'O preço deve ter no máximo 2 casas decimais.',
  });

const optionalPriceSchema = priceSchema.optional().nullable();

/**
 * Regra aplicada em create e update (após .partial()):
 * se ambos os preços forem informados, o promocional não pode
 * ser maior que o preço normal.
 */
function promoPriceRule(data: {
  price?: number | null | undefined;
  promotionalPrice?: number | null | undefined;
}): boolean {
  if (
    data.promotionalPrice === undefined ||
    data.promotionalPrice === null ||
    data.price === undefined ||
    data.price === null
  ) {
    return true;
  }
  return data.promotionalPrice <= data.price;
}

const productFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome do produto deve ter no mínimo 2 caracteres.')
    .max(150, 'O nome do produto deve ter no máximo 150 caracteres.'),
  description: z
    .string()
    .trim()
    .max(500, 'A descrição deve ter no máximo 500 caracteres.')
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .trim()
    .url('URL de imagem inválida.')
    .max(500, 'URL de imagem muito longa.')
    .optional()
    .nullable(),
  categoryId: z.string().uuid('ID da categoria inválido.'),
  price: priceSchema,
  promotionalPrice: optionalPriceSchema,
  preparationTime: z
    .number()
    .int('O tempo de preparo deve ser um inteiro.')
    .min(0, 'O tempo de preparo não pode ser negativo.')
    .max(10080, 'O tempo de preparo deve ser no máximo 10080 minutos (7 dias).')
    .optional()
    .nullable(),
  ingredients: z
    .string()
    .trim()
    .max(1000, 'Os ingredientes devem ter no máximo 1000 caracteres.')
    .optional()
    .nullable(),
  allergens: z
    .string()
    .trim()
    .max(500, 'Os alérgenos devem ter no máximo 500 caracteres.')
    .optional()
    .nullable(),
  displayOrder: z
    .number()
    .int('O displayOrder deve ser um inteiro.')
    .min(0, 'O displayOrder não pode ser negativo.')
    .max(9999, 'O displayOrder deve ser no máximo 9999.')
    .optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  available: z.boolean().optional(),
});

export const createProductSchema = productFieldsSchema.refine(promoPriceRule, {
  message: 'O preço promocional não pode ser maior que o preço.',
  path: ['promotionalPrice'],
});

export const updateProductSchema = productFieldsSchema.partial().refine(promoPriceRule, {
  message: 'O preço promocional não pode ser maior que o preço.',
  path: ['promotionalPrice'],
});

export const productIdParamSchema = z.object({
  id: z.string().uuid('ID do produto inválido.'),
});

/** Filtros da listagem de produtos. */
export const listProductsQuerySchema = z.object({
  categoryId: z.string().uuid('ID da categoria inválido.').optional(),
  orderBy: z.enum(['displayOrder', 'name', 'price', 'createdAt']).default('displayOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

/** Corpo para alternar disponibilidade via PATCH. */
export const availabilitySchema = z.object({
  available: z.boolean('O campo available deve ser true ou false.'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
