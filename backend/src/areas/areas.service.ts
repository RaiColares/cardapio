import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type { CreateAreaInput, UpdateAreaInput } from './areas.schemas.js';

/**
 * Service do módulo de Áreas.
 *
 * REGRA DE OURO: o establishmentId NUNCA vem do cliente.
 * Ele é injetado a partir do JWT em toda operação de leitura
 * e escrita, garantindo isolamento entre estabelecimentos.
 */

/** Lista áreas do estabelecimento autenticado. */
export async function listAreas(establishmentId: string) {
  return prisma.area.findMany({
    where: { establishmentId },
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { tables: true } },
    },
    orderBy: { name: 'asc' },
  });
}

/** Busca uma área garantindo que pertence ao estabelecimento autenticado. */
export async function getAreaById(id: string, establishmentId: string) {
  const area = await prisma.area.findFirst({
    where: { id, establishmentId },
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { tables: true } },
    },
  });

  if (!area) {
    throw new AppError(404, 'AREA_NOT_FOUND', 'Área não encontrada.');
  }

  return area;
}

/** Cria uma área vinculada ao estabelecimento autenticado. */
export async function createArea(input: CreateAreaInput, establishmentId: string) {
  return prisma.area.create({
    data: {
      establishmentId,
      name: input.name,
      description: input.description ?? null,
      active: input.active ?? true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { tables: true } },
    },
  });
}

/** Atualiza uma área (somente se pertencer ao estabelecimento autenticado). */
export async function updateArea(
  id: string,
  input: UpdateAreaInput,
  establishmentId: string,
) {
  await getAreaById(id, establishmentId);

  return prisma.area.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      active: input.active,
    },
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { tables: true } },
    },
  });
}

/**
 * Remove uma área.
 *
 * Proteção de integridade: se ainda existirem mesas atreladas,
 * retorna 400 com mensagem amigável (evita exceção crua do banco,
 * já que a FK area_id é ON DELETE RESTRICT).
 */
export async function deleteArea(id: string, establishmentId: string) {
  await getAreaById(id, establishmentId);

  const tablesCount = await prisma.table.count({
    where: { areaId: id, establishmentId },
  });

  if (tablesCount > 0) {
    throw new AppError(
      400,
      'AREA_HAS_TABLES',
      'Não é possível excluir a área: existem mesas vinculadas a ela.',
    );
  }

  await prisma.area.delete({ where: { id } });
}
