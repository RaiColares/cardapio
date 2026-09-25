import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type {
  CreateModifierInput,
  UpdateModifierInput,
} from './modifiers.schemas.js';

/**
 * Service do módulo de Adicionais (Modifier).
 *
 * REGRA DE OURO: multi-tenancy garantido indiretamente — o
 * modifierGroupId é validado contra o establishmentId do JWT antes
 * de qualquer operação. Nunca confiamos somente no ID enviado.
 */

export const modifierSelect = {
  id: true,
  modifierGroupId: true,
  name: true,
  price: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Garante que o grupo pertence ao establishment autenticado. */
async function ensureGroupInTenant(groupId: string, establishmentId: string) {
  const group = await prisma.modifierGroup.findFirst({
    where: { id: groupId, establishmentId },
    select: { id: true, name: true },
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

/** Lista adicionais do estabelecimento (filtro opcional por grupo). */
export async function listModifiers(
  establishmentId: string,
  modifierGroupId?: string,
  active?: boolean,
) {
  const where: Record<string, unknown> = {
    modifierGroup: { establishmentId },
  };

  if (modifierGroupId) {
    await ensureGroupInTenant(modifierGroupId, establishmentId);
    where.modifierGroupId = modifierGroupId;
  }

  if (active !== undefined) {
    where.active = active;
  }

  return prisma.modifier.findMany({
    where,
    select: {
      ...modifierSelect,
      price: true,
      modifierGroup: { select: { id: true, name: true, establishmentId: true } },
    },
    orderBy: [{ modifierGroupId: 'asc' }, { name: 'asc' }],
  });
}

/** Busca um adicional garantindo tenant (via grupo). */
export async function getModifierById(id: string, establishmentId: string) {
  const modifier = await prisma.modifier.findFirst({
    where: {
      id,
      modifierGroup: { establishmentId },
    },
    select: {
      ...modifierSelect,
      modifierGroup: { select: { id: true, name: true, establishmentId: true } },
    },
  });

  if (!modifier) {
    throw new AppError(
      404,
      'MODIFIER_NOT_FOUND',
      'Adicional não encontrado.',
    );
  }

  return modifier;
}

/** Cria um adicional vinculado a um grupo do estabelecimento autenticado. */
export async function createModifier(
  input: CreateModifierInput,
  establishmentId: string,
) {
  await ensureGroupInTenant(input.modifierGroupId, establishmentId);

  return prisma.modifier.create({
    data: {
      modifierGroupId: input.modifierGroupId,
      name: input.name,
      price: input.price,
      active: input.active ?? true,
    },
    select: {
      ...modifierSelect,
      modifierGroup: { select: { id: true, name: true, establishmentId: true } },
    },
  });
}

/** Atualiza um adicional (somente se o grupo pertencer ao tenant). */
export async function updateModifier(
  id: string,
  input: UpdateModifierInput,
  establishmentId: string,
) {
  await getModifierById(id, establishmentId);

  if (input.modifierGroupId) {
    await ensureGroupInTenant(input.modifierGroupId, establishmentId);
  }

  return prisma.modifier.update({
    where: { id },
    data: {
      modifierGroupId: input.modifierGroupId,
      name: input.name,
      price: input.price,
      active: input.active,
    },
    select: {
      ...modifierSelect,
      modifierGroup: { select: { id: true, name: true, establishmentId: true } },
    },
  });
}

/**
 * Remove um adicional.
 *
 * Pedidos antigos preservam o histórico: a FK order_item_modifiers
 * é ON DELETE SET NULL — o snapshot de nome/preço permanece intacto
 * no pedido, apenas o vínculo com o cadastro atual é removido.
 */
export async function deleteModifier(id: string, establishmentId: string) {
  await getModifierById(id, establishmentId);
  await prisma.modifier.delete({ where: { id } });
}
