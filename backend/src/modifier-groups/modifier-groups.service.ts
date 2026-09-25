import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type {
  CreateModifierGroupInput,
  UpdateModifierGroupInput,
} from './modifier-groups.schemas.js';

/**
 * Service do módulo de Grupos de Adicionais (ModifierGroup).
 *
 * REGRA DE OURO: o establishmentId NUNCA vem do cliente; é injetado
 * a partir do JWT (multi-tenancy).
 */

export const modifierGroupSelect = {
  id: true,
  name: true,
  selectionType: true,
  minSelections: true,
  maxSelections: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Lista grupos de adicionais do estabelecimento autenticado. */
export async function listModifierGroups(establishmentId: string) {
  return prisma.modifierGroup.findMany({
    where: { establishmentId },
    select: {
      ...modifierGroupSelect,
      _count: {
        select: { modifiers: true, products: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

/** Busca um grupo garantindo que pertence ao estabelecimento autenticado. */
export async function getModifierGroupById(id: string, establishmentId: string) {
  const group = await prisma.modifierGroup.findFirst({
    where: { id, establishmentId },
    select: {
      ...modifierGroupSelect,
      modifiers: {
        select: {
          id: true,
          name: true,
          price: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      },
      _count: { select: { products: true } },
    },
  });

  if (!group) {
    throw new AppError(
      404,
      'MODIFIER_GROUP_NOT_FOUND',
      'Grupo de adicionais não encontrado.',
    );
  }

  return group;
}

/** Cria um grupo vinculado ao estabelecimento autenticado. */
export async function createModifierGroup(
  input: CreateModifierGroupInput,
  establishmentId: string,
) {
  return prisma.modifierGroup.create({
    data: {
      establishmentId,
      name: input.name,
      selectionType: input.selectionType ?? 'SINGLE',
      minSelections: input.minSelections ?? 0,
      maxSelections: input.maxSelections ?? null,
      active: input.active ?? true,
    },
    select: {
      ...modifierGroupSelect,
      _count: { select: { modifiers: true, products: true } },
    },
  });
}

/** Atualiza um grupo (somente se pertencer ao estabelecimento autenticado). */
export async function updateModifierGroup(
  id: string,
  input: UpdateModifierGroupInput,
  establishmentId: string,
) {
  await getModifierGroupById(id, establishmentId);

  // Consistência: minSelections não pode superar maxSelections (quando ambos presentes).
  const minSelections = input.minSelections;
  const maxSelections = input.maxSelections;

  if (
    minSelections !== undefined &&
    maxSelections !== undefined &&
    maxSelections !== null &&
    minSelections > maxSelections
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'O mínimo de seleções não pode ser maior que o máximo.',
    );
  }

  return prisma.modifierGroup.update({
    where: { id },
    data: {
      name: input.name,
      selectionType: input.selectionType,
      minSelections: input.minSelections,
      maxSelections: input.maxSelections,
      active: input.active,
    },
    select: {
      ...modifierGroupSelect,
      _count: { select: { modifiers: true, products: true } },
    },
  });
}

/**
 * Remove um grupo.
 *
 * Proteção de integridade: se o grupo estiver vinculado a produtos
 * (ProductModifierGroup), recusa a exclusão com mensagem amigável —
 * preserva o catálogo ativo. A FK modifier_group_id é ON DELETE
 * CASCADE no banco; a checagem abaixo evita quebra silenciosa de
 * cardápios em uso.
 */
export async function deleteModifierGroup(id: string, establishmentId: string) {
  await getModifierGroupById(id, establishmentId);

  const productsCount = await prisma.productModifierGroup.count({
    where: { modifierGroupId: id },
  });

  if (productsCount > 0) {
    throw new AppError(
      400,
      'MODIFIER_GROUP_HAS_PRODUCTS',
      'Não é possível excluir o grupo: ele está vinculado a produtos do cardápio.',
    );
  }

  await prisma.modifierGroup.delete({ where: { id } });
}
