import type { UserRole } from '@prisma/client';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AppError } from '../errors/AppError.js';

/**
 * Papéis com acesso IRRESTRITO às rotas operacionais da plataforma.
 *
 * REGRA (FASE 23 — Acessos Globais): ADMIN e MANAGER são papéis
 * SUPERVISORES. Eles NUNCA ficam bloqueados por uma allowlist de rota
 * operacional — inclusive as rotas exclusivas dos painéis /waiter e
 * /kitchen. Isso é aplicado de forma CENTRALIZADA aqui (e não repetida
 * rota a rota), para que nenhuma rota operacional nova nasça com o
 * MANAGER por engano de fora da lista.
 *
 * O efeito é espelhado no frontend: /admin/*, /waiter e /kitchen aceitam
 * ADMIN e MANAGER.
 *
 * A RBAC fina de pedido (transições de status, escopo da fila) continua
 * no service de pedidos, onde ADMIN/MANAGER já recebem visão global.
 */
export const ELEVATED_ROLES: readonly UserRole[] = ['ADMIN', 'MANAGER'];

function isElevatedRole(role: string): boolean {
  return ELEVATED_ROLES.includes(role as UserRole);
}

/**
 * Middleware de autorização baseado em roles (RBAC).
 *
 * Uso: authorize('ADMIN', 'MANAGER')
 *
 * Deve ser aplicado SEMPRE após o authenticate.
 *
 * Deixa passar quando a role do usuário autenticada:
 *  1. está entre as permitidas para a rota; OU
 *  2. é uma role elevada (ADMIN/MANAGER) — ver ELEVATED_ROLES.
 */
export function authorize(...allowedRoles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.'));
      return;
    }

    if (isElevatedRole(req.user.role) || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    next(new AppError(403, 'FORBIDDEN', 'Permissão insuficiente.'));
  };
}

/**
 * Escape explícito da regra dos papéis elevadas: SOMENTE ADMIN.
 *
 * Usado nas rotas de GESTÃO DE EQUIPE (`/users`), que NÃO são operacionais
 * e deliberadamente ficam fora do acesso irrestrito de ADMIN/MANAGER —
 * o MANAGER não pode gerir credenciais de outros gestores.
 *
 * A exceção é explícita neste arquivo (e não implícita por omissão),
 * para que a decisão fique visível e auditável.
 *
 * O service ainda impede escalada de privilégio: `teamRoles` nunca cria
 * ADMIN e `CANNOT_MODIFY_ADMIN`/`CANNOT_DELETE_ADMIN` protegem o dono.
 */
export function authorizeAdminOnly(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.'));
      return;
    }

    if (req.user.role !== 'ADMIN') {
      next(new AppError(403, 'FORBIDDEN', 'Permissão insuficiente.'));
      return;
    }

    next();
  };
}
