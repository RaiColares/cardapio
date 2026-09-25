import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from './categories.schemas.js';

/**
 * Service do módulo de Categorias.
 *
 * Multi-tenancy: o establishmentId vem do JWT em todas as operações.
 * Nenhuma categoria de outro estabelecimento pode ser lida/alterada.
 */

const categorySelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  icon: true,
  displayOrder: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Lista categorias do estabelecimento, ordenadas por displayOrder por padrão. */
export async function listCategories(establishmentId: string, query: ListCategoriesQuery) {
  return prisma.category.findMany({
    where: { establishmentId },
    select: {
      ...categorySelect,
      _count: { select: { products: true } },
    },
    orderBy: { [query.orderBy]: query.order },
  });
}

/** Busca uma categoria garantindo o vínculo com o estabelecimento autenticado. */
export async function getCategoryById(id: string, establishmentId: string) {
  const category = await prisma.category.findFirst({
    where: { id, establishmentId },
    select: {
      ...categorySelect,
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Categoria não encontrada.');
  }

  return category;
}

/** Cria uma categoria vinculada ao estabelecimento autenticado. */
export async function createCategory(
  input: CreateCategoryInput,
  establishmentId: string,
) {
  return prisma.category.create({
    data: {
      establishmentId,
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      icon: input.icon ?? null,
      displayOrder: input.displayOrder ?? 0,
      active: input.active ?? true,
    },
    select: {
      ...categorySelect,
      _count: { select: { products: true } },
    },
  });
}

/** Atualiza uma categoria (somente se pertencer ao estabelecimento autenticado). */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
  establishmentId: string,
) {
  await getCategoryById(id, establishmentId);

  return prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      icon: input.icon,
      displayOrder: input.displayOrder,
      active: input.active,
    },
    select: {
      ...categorySelect,
      _count: { select: { products: true } },
    },
  });
}

/**
 * Remove uma categoria.
 *
 * Proteção de integridade: se existirem produtos atrelados, retorna
 * 400 com mensagem amigável (a FK products.category_id é RESTRICT).
 */
export async function deleteCategory(id: string, establishmentId: string) {
  await getCategoryById(id, establishmentId);

  const productsCount = await prisma.product.count({
    where: { categoryId: id, establishmentId },
  });

  if (productsCount > 0) {
    throw new AppError(
      400,
      'CATEGORY_HAS_PRODUCTS',
      'Não é possível excluir a categoria: existem produtos vinculados a ela.',
    );
  }

  await prisma.category.delete({ where: { id } });
}
