import type { UserRole } from '@prisma/client';

/**
 * FASE 23 — Visibilidade de mesas e pedidos no salão.
 *
 * O vínculo NxN `Table.waiters` define quem enxerga a mesa e recebe os
 * seus pedidos em tempo real. Este módulo centraliza a regra para que
 * `GET /tables`, `GET /orders` e a emissão WebSocket permaneçam coerentes.
 *
 * O `establishmentId` (tenant) NUNCA é decidido aqui: ele continua sendo
 * aplicado separadamente a partir do JWT. Estes fragmentos tratam apenas
 * da atribuição de garçons.
 */

/** Contexto mínimo do usuário autenticado (derivado do JWT). */
export interface AuthContext {
  userId: string;
  establishmentId: string;
  role: UserRole;
}

/**
 * Fragmento de `where` que limita as MESAS visíveis ao usuário.
 *
 * - ADMIN/MANAGER: todas as mesas do estabelecimento;
 * - WAITER/KITCHEN: mesas SEM garçons vinculados (de todos) + mesas em
 *   que o próprio usuário está entre os garçons vinculados.
 */
export function tableVisibilityWhere(ctx: AuthContext): Record<string, unknown> {
  if (ctx.role === 'ADMIN' || ctx.role === 'MANAGER') {
    return {};
  }

  return {
    OR: [
      { waiters: { none: {} } },
      { waiters: { some: { id: ctx.userId } } },
    ],
  };
}

/**
 * Fragmento de `where` que limita os PEDIDOS visíveis ao usuário.
 *
 * - ADMIN/MANAGER: visão global;
 * - KITCHEN: visão global (necessária ao preparo — não é papel do salão);
 * - WAITER: apenas pedidos de mesas SEM garçons vinculados ou mesas
 *   vinculadas a ele.
 */
export function orderVisibilityWhere(ctx: AuthContext): Record<string, unknown> {
  if (ctx.role === 'ADMIN' || ctx.role === 'MANAGER' || ctx.role === 'KITCHEN') {
    return {};
  }

  return {
    table: {
      OR: [
        { waiters: { none: {} } },
        { waiters: { some: { id: ctx.userId } } },
      ],
    },
  };
}

/** IDs dos garçons vinculados a uma mesa (para roteamento realtime). */
export function waiterIdsOf(
  waiters: Array<{ id: string }> | undefined | null,
): string[] {
  return (waiters ?? []).map((waiter) => waiter.id);
}
