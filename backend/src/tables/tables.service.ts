import { randomUUID } from 'node:crypto';

import { TableSessionStatus } from '@prisma/client';

import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import {
  tableVisibilityWhere,
  type AuthContext,
} from '../common/visibility/table-visibility.js';
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

/**
 * FASE 23 — Garçons vinculados à mesa (NxN).
 *
 * Exposto nas respostas para que os painéis saibam a quem a mesa está
 * atribuída. Nunca inclui passwordHash (select explícito).
 */
const waitersSelect = {
  waiters: {
    select: { id: true, name: true, email: true, role: true, active: true },
    orderBy: { name: 'asc' },
  },
} as const;

/**
 * FASE 23 — Sessão aberta da mesa.
 *
 * Uma mesa pode ter no máximo uma comanda OPEN por vez. O frontend usa o
 * `activeSessionId` para abrir a gaveta da conta e fechar mesas mesmo sem
 * consumo (o vínculo é com a sessão, não com a existência de pedidos).
 */
const activeSessionSelect = {
  tableSessions: {
    where: { status: TableSessionStatus.OPEN },
    select: { id: true },
    orderBy: { openedAt: 'desc' },
    take: 1,
  },
} as const;

/**
 * Select padrão de detalhe da mesa: campos públicos + garçons vinculados +
 * sessão aberta + área. A serialização troca o array `tableSessions` por
 * `activeSessionId` (ver `toTableResponse`).
 */
const tableDetailSelect = {
  ...tableSelect,
  ...waitersSelect,
  ...activeSessionSelect,
  area: { select: { id: true, name: true } },
} as const;

/**
 * Converte a linha do Prisma para o contrato da API, substituindo
 * `tableSessions: [{ id }]` por `activeSessionId: string | null`.
 */
function toTableResponse<T extends { tableSessions: { id: string }[] }>(
  table: T,
): Omit<T, 'tableSessions'> & { activeSessionId: string | null } {
  const { tableSessions, ...rest } = table;
  return { ...rest, activeSessionId: tableSessions[0]?.id ?? null };
}

/**
 * Lista mesas do estabelecimento autenticado (opcional por área).
 *
 * FASE 23: quando `viewer` é informado, aplica a visibilidade do salão
 * (garçons só enxergam mesas sem vínculo ou vinculadas a eles).
 */
export async function listTables(
  establishmentId: string,
  areaId?: string,
  viewer?: AuthContext,
) {
  const tables = await prisma.table.findMany({
    where: {
      establishmentId,
      ...(areaId ? { areaId } : {}),
      ...(viewer ? tableVisibilityWhere(viewer) : {}),
    },
    select: tableDetailSelect,
    orderBy: [{ number: 'asc' }],
  });

  return tables.map(toTableResponse);
}

/**
 * Busca uma mesa garantindo que pertence ao estabelecimento autenticado.
 * Quando `viewer` é informado, a visibilidade do salão também é aplicada
 * (um garçom não enxerga mesa atribuída a outro garçom).
 */
export async function getTableById(
  id: string,
  establishmentId: string,
  viewer?: AuthContext,
) {
  const table = await prisma.table.findFirst({
    where: {
      id,
      establishmentId,
      ...(viewer ? tableVisibilityWhere(viewer) : {}),
    },
    select: tableDetailSelect,
  });

  if (!table) {
    throw new AppError(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
  }

  return toTableResponse(table);
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
    select: tableDetailSelect,
  });

  return toTableResponse(table);
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

  const table = await prisma.table.update({
    where: { id },
    data: {
      number: input.number,
      name: input.name,
      capacity: input.capacity,
      areaId: input.areaId,
      active: input.active,
    },
    select: tableDetailSelect,
  });

  return toTableResponse(table);
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

/**
 * FASE 23 — PUT /tables/:id/waiters
 *
 * Vincula (substitui) os garçons de uma mesa. Enviar `userIds: []`
 * limpa o vínculo (mesa volta a ser visível a todos os painéis).
 *
 * Multi-tenancy: a mesa e TODOS os garçons devem pertencer ao mesmo
 * estabelecimento do JWT; a role deve ser WAITER e o usuário ativo.
 */
export async function assignTableWaiters(
  id: string,
  userIds: string[],
  establishmentId: string,
) {
  await getTableById(id, establishmentId);

  const uniqueIds = [...new Set(userIds)];

  if (uniqueIds.length > 0) {
    const waiters = await prisma.user.findMany({
      where: {
        id: { in: uniqueIds },
        establishmentId,
        role: 'WAITER',
        active: true,
      },
      select: { id: true },
    });

    if (waiters.length !== uniqueIds.length) {
      throw new AppError(
        400,
        'INVALID_WAITER',
        'Todos os usuários devem ser garçons (WAITER) ativos do mesmo estabelecimento.',
      );
    }
  }

  const table = await prisma.table.update({
    where: { id },
    data: {
      waiters: { set: uniqueIds.map((userId) => ({ id: userId })) },
    },
    select: tableDetailSelect,
  });

  return toTableResponse(table);
}
