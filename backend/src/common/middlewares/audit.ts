import type { NextFunction, Request, Response } from 'express';

import { Prisma } from '@prisma/client';

import { prisma } from '../prisma/prisma.js';

/**
 * Gravador de Auditoria (FASE 22).
 *
 * Middleware global (montado em /api/v1) que registra ações CRUD
 * (POST/PUT/PATCH/DELETE) nas rotas PRIVADAS na tabela audit_logs.
 *
 * - Apenas requisições autenticadas (req.user presente) são gravadas —
 *   rotas públicas (login, menu, pedido do cliente) ficam de fora;
 * - `action` = método + rota (ex.: "PATCH /api/v1/orders/<id>/status");
 * - `entity`/`entityId` são derivados da URL (multi-tenancy preservado:
 *   o establishmentId NÃO é copiado para o log — a listagem o resolve via
 *   a relação com o usuário, como em reports.service);
 * - `metadata` = body saneado (nunca persiste senhas/tokens), limitado;
 * - Gravado em fire-and-forget após o envio da resposta (apenas 2xx/3xx):
 *   falha de auditoria NUNCA derruba a requisição.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Campos sensíveis removidos do metadata (comparação em minúsculas). */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'oldpassword',
  'newpassword',
  'currentpassword',
  'accesstoken',
  'refreshtoken',
  'token',
  'secret',
]);

/** Lança o "entity" a partir do módulo (segmento após /api/v1). */
const ENTITY_BY_MODULE: Record<string, string> = {
  auth: 'AUTH',
  users: 'USER',
  establishments: 'ESTABLISHMENT',
  dashboard: 'DASHBOARD',
  areas: 'AREA',
  tables: 'TABLE',
  categories: 'CATEGORY',
  products: 'PRODUCT',
  'modifier-groups': 'MODIFIER_GROUP',
  modifiers: 'MODIFIER',
  orders: 'ORDER',
  'table-sessions': 'TABLE_SESSION',
  payments: 'PAYMENT',
  reports: 'REPORT',
};

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Remove campos sensíveis e trunca profundidade/tamanho do payload. */
function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > 3) {
    return '[truncado]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizePayload(item, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(record)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        continue;
      }
      result[key] = sanitizePayload(item, depth + 1);
    }

    return result;
  }

  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }

  return value;
}

/** Deriva action, entity e entityId da URL da requisição. */
function buildContext(req: Request): { action: string; entity: string; entityId: string | null } {
  const path = `${req.baseUrl}${req.path}`.replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);

  // Ex.: /api/v1/orders/<uuid>/status → ['api','v1','orders','<uuid>','status']
  const moduleSegment = segments[2];
  const entity =
    (moduleSegment && ENTITY_BY_MODULE[moduleSegment]) ||
    (moduleSegment ? moduleSegment.toUpperCase() : 'API');

  const uuidMatch = path.match(UUID_PATTERN);
  const entityId = uuidMatch ? (uuidMatch[uuidMatch.length - 1] ?? null) : null;

  return { action: `${req.method} ${path}`, entity, entityId };
}

/**
 * Intercepta mutações autenticadas e registra em audit_logs após a resposta.
 * Fire-and-forget: o log nunca bloqueia nem derruba a requisição.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const actor = req.user;

  if (!MUTATING_METHODS.has(req.method) || !actor) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 400) {
      return;
    }

    const { action, entity, entityId } = buildContext(req);
    const metadata = sanitizePayload(req.body);
    const hasMetadata =
      metadata !== undefined &&
      metadata !== null &&
      (typeof metadata !== 'object' || Object.keys(metadata).length > 0);

    prisma.auditLog
      .create({
        data: {
          userId: actor.userId,
          action,
          entity,
          entityId,
          metadata: hasMetadata
            ? (metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      })
      .catch((error: unknown) => {
        console.error('[audit] Falha ao gravar log de auditoria:', error);
      });
  });

  next();
}