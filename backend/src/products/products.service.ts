import type { Prisma } from '@prisma/client';

import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type {
  CreateProductInput,
  CreateVariantInput,
  ListProductsQuery,
  UpdateProductInput,
} from './products.schemas.js';

/**
 * Service do módulo de Produtos e Variações.
 *
 * REGRA DE OURO: o establishmentId NUNCA vem do cliente e o categoryId
 * é validado quanto ao tenant antes de qualquer vínculo.
 */

const productInclude = {
  category: { select: { id: true, name: true } },
  variants: {
    where: { active: true },
    orderBy: { displayOrder: 'asc' as const },
  },
} satisfies Prisma.ProductInclude;

/** Converte Decimal do Prisma em number para o contrato da API. */
function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function serializeProduct(product: {
  price: unknown;
  promotionalPrice: unknown;
  variants?: { price: unknown }[];
}) {
  return {
    ...product,
    price: normalizePrice(product.price),
    promotionalPrice: normalizePrice(product.promotionalPrice),
    variants: product.variants?.map((variant) => ({
      ...variant,
      price: normalizePrice(variant.price),
    })),
  };
}

/** Lista produtos do estabelecimento (com filtros/filtro de categoria). */
export async function listProducts(establishmentId: string, query: ListProductsQuery) {
  const where: Prisma.ProductWhereInput = { establishmentId };

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: { [query.orderBy]: query.order },
  });

  return products.map(serializeProduct);
}

/** Busca um produto garantindo o vínculo com o estabelecimento autenticado. */
export async function getProductById(id: string, establishmentId: string) {
  const product = await prisma.product.findFirst({
    where: { id, establishmentId },
    include: productInclude,
  });

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
  }

  return serializeProduct(product);
}

/**
 * Valida que a categoria existe e pertence ao MESMO estabelecimento.
 * Impede vínculo de produto a categoria de terceiros.
 */
async function ensureCategoryBelongsToEstablishment(
  categoryId: string,
  establishmentId: string,
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, establishmentId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(400, 'CATEGORY_NOT_FOUND', 'Categoria inválida para o estabelecimento.');
  }
}

/** Cria um produto com variantes vazias e disponível por padrão. */
export async function createProduct(
  input: CreateProductInput,
  establishmentId: string,
) {
  await ensureCategoryBelongsToEstablishment(input.categoryId, establishmentId);

  const product = await prisma.product.create({
    data: {
      establishmentId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      price: input.price,
      promotionalPrice: input.promotionalPrice ?? null,
      preparationTime: input.preparationTime ?? null,
      ingredients: input.ingredients ?? null,
      allergens: input.allergens ?? null,
      displayOrder: input.displayOrder ?? 0,
      featured: input.featured ?? false,
      active: input.active ?? true,
      available: input.available ?? true,
    },
    include: productInclude,
  });

  return serializeProduct(product);
}

/** Atualiza um produto (valida categoria de outro tenant quando alterada). */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  establishmentId: string,
) {
  await getProductById(id, establishmentId);

  if (input.categoryId) {
    await ensureCategoryBelongsToEstablishment(input.categoryId, establishmentId);
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      price: input.price,
      promotionalPrice: input.promotionalPrice,
      preparationTime: input.preparationTime,
      ingredients: input.ingredients,
      allergens: input.allergens,
      displayOrder: input.displayOrder,
      featured: input.featured,
      active: input.active,
      available: input.available,
    },
    include: productInclude,
  });

  return serializeProduct(product);
}

/**
 * Alterna rapidamente a flag available (pausar um item que acabou na cozinha).
 */
export async function setProductAvailability(
  id: string,
  establishmentId: string,
  available: boolean,
) {
  await getProductById(id, establishmentId);

  const product = await prisma.product.update({
    where: { id },
    data: { available },
    include: productInclude,
  });

  return serializeProduct(product);
}

/**
 * Remove um produto.
 *
 * Proteção de integridade: se existirem itens de pedido atrelados,
 * retorna 400 amigável (a FK order_items.product_id é RESTRICT).
 * Variantes são removidas via CASCADE.
 */
export async function deleteProduct(id: string, establishmentId: string) {
  await getProductById(id, establishmentId);

  const itemsCount = await prisma.orderItem.count({
    where: { productId: id },
  });

  if (itemsCount > 0) {
    throw new AppError(
      400,
      'PRODUCT_HAS_ORDERS',
      'Não é possível excluir o produto: existem pedidos que o utilizam.',
    );
  }

  await prisma.product.delete({ where: { id } });
}

/**
 * Adiciona uma variação (tamanho/preço, ex: P, M, G) a um produto.
 */
export async function addVariant(
  productId: string,
  input: CreateVariantInput,
  establishmentId: string,
) {
  await getProductById(productId, establishmentId);

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      name: input.name,
      price: input.price,
      displayOrder: input.displayOrder ?? 0,
      active: input.active ?? true,
    },
  });

  return { ...variant, price: normalizePrice(variant.price) };
}

/** Lista todas as variações de um produto (ativas e inativas). */
export async function listVariants(productId: string, establishmentId: string) {
  await getProductById(productId, establishmentId);

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { displayOrder: 'asc' },
  });

  return variants.map((variant) => ({ ...variant, price: normalizePrice(variant.price) }));
}

/** Remove uma variação de um produto. */
export async function deleteVariant(
  productId: string,
  variantId: string,
  establishmentId: string,
) {
  await getProductById(productId, establishmentId);

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
    select: { id: true },
  });

  if (!variant) {
    throw new AppError(404, 'VARIANT_NOT_FOUND', 'Variação não encontrada.');
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
}
