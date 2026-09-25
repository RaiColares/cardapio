import { randomUUID } from 'node:crypto';

import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type { CreateTableInput, UpdateTableInput } from './tables.schemas.js';

/**
 * Service do módulo de Mesas.
 *
 * REGRA DE OURO: o establishmentId NUNCA vem do cliente.
 * Ele é injetado a partir do JWT em toda operação de leitura
 * e escrita, garantindo isolamento entre estabelecimentos.
 *
 * QR Code: gerado automaticamente na criação como UUID v4,
 * usado pelo frontend para montar a URL pública da mesa
 * (ex.: /menu/table/:qrCode).
 */

const tableSelect = {
  id: true,
  number: true,
  name: true,
  capacity: true,
  status: true,
  qrCode: true,
  active: true,
  areaId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Lista mesas do estabelecimento autenticado (opcional por área). */
export async function listTables(establishmentId: string, areaId?: string) {
  return prisma.table.findMany({
    where: {
      establishmentId,
      ...(areaId ? { areaId } : {}),
    },
    select: {
      ...tableSelect,
      area: { select: { id: true, name: true } },
    },
    orderBy: [{ number: 'asc' }],
  });
}

/** Busca uma mesa garantindo que pertence ao estabelecimento autenticado. */
export async function getTableById(id: string, establishmentId: string) {
  const table = await prisma.table.findFirst({
    where: { id, establishmentId },
    select: {
      ...tableSelect,
      area: { select: { id: true, name: true } },
    },
  });

  if (!table) {
    throw new AppError(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
  }

  return table;
}

/** Valida que a área existe e pertence ao mesmo estabelecimento (tenant). */
async function ensureAreaBelongsToEstablishment(areaId: string, establishmentId: string) {
  const area = await prisma.area.findFirst({
    where: { id: areaId, establishmentId },
    select: { id: true },
  });

  if (!area) {
    throw new AppError(400, 'AREA_NOT_FOUND', 'Área inválida para o estabelecimento.');
  }
}

/** Impede número duplicado dentro do estabelecimento (unique establishmentId+number). */
async function ensureUniqueTableNumber(
  number: string,
  establishmentId: string,
  ignoreId?: string,
) {
  const existing = await prisma.table.findFirst({
    where: {
      establishmentId,
      number,
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(409, 'TABLE_NUMBER_CONFLICT', 'Já existe uma mesa com este número.');
  }
}

/** Cria uma mesa com qrCode UUID v4 gerado automaticamente. */
export async function createTable(input: CreateTableInput, establishmentId: string) {
  await ensureAreaBelongsToEstablishment(input.areaId, establishmentId);
  await ensureUniqueTableNumber(input.number, establishmentId);

  const table = await prisma.table.create({
    data: {
      establishmentId,
      areaId: input.areaId,
      number: input.number,
      name: input.name ?? null,
      capacity: input.capacity,
      qrCode: randomUUID(),
      active: input.active ?? true,
    },
    select: {
      ...tableSelect,
      area: { select: { id: true, name: true } },
    },
  });

  return table;
}

/** Atualiza uma mesa (somente se pertencer ao estabelecimento autenticado). */
export async function updateTable(
  id: string,
  input: UpdateTableInput,
  establishmentId: string,
) {
  await getTableById(id, establishmentId);

  if (input.areaId) {
    await ensureAreaBelongsToEstablishment(input.areaId, establishmentId);
  }

  if (input.number) {
    await ensureUniqueTableNumber(input.number, establishmentId, id);
  }

  return prisma.table.update({
    where: { id },
    data: {
      number: input.number,
      name: input.name,
      capacity: input.capacity,
      areaId: input.areaId,
      active: input.active,
    },
    select: {
      ...tableSelect,
      area: { select: { id: true, name: true } },
    },
  });
}

/**
 * Remove uma mesa.
 *
 * Proteção de integridade: se existirem sessões (comandas) ou pedidos
 * atrelados, retorna 400 com mensagem amigável (as FKs são ON DELETE
 * RESTRICT, evitando exceção crua do banco).
 */
export async function deleteTable(id: string, establishmentId: string) {
  await getTableById(id, establishmentId);

  const [sessionsCount, ordersCount] = await Promise.all([
    prisma.tableSession.count({ where: { tableId: id, establishmentId } }),
    prisma.order.count({ where: { tableId: id, establishmentId } }),
  ]);

  if (sessionsCount > 0 || ordersCount > 0) {
    throw new AppError(
      400,
      'TABLE_HAS_SESSIONS_OR_ORDERS',
      'Não é possível excluir a mesa: existem comandas ou pedidos vinculados a ela.',
    );
  }

  await prisma.table.delete({ where: { id } });
}
