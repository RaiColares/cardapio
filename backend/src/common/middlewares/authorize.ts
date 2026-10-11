import type { AuthRequest } from '../types/auth-request.js';
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
 * FASE 27 — SUPER_ADMIN (supervisor global da plataforma SaaS) também é
 * papel elevado: reconhecido por `authorize` e liberado nas rotas
 * operacionais do estabelecimento ao qual o token pertence (o tenant é
 * sempre imposto pelo establishmentId do JWT — não há vazamento entre
 * clientes). A gestão GLOBAL de clientes NÃO fica aqui: ela é restrita
 * ao router `/admin` pelo helper estrito `authorizeSuperAdminOnly`.
 *
 * O efeito é espelhado no frontend: /admin/*, /waiter e /kitchen aceitam
 * ADMIN e MANAGER.
 *
 * A RBAC fina de pedido (transições de status, escopo da fila) continua
 * no service de pedidos, onde ADMIN/MANAGER já recebem visão global.
 */
export const ELEVATED_ROLES: readonly UserRole[] = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];

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
  return ((req: AuthRequest | any, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.'));
      return;
    }

    if (isElevatedRole(req.user.role) || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    next(new AppError(403, 'FORBIDDEN', 'Permissão insuficiente.'));
  }) as any;
}

/**
 * Escape estrito para as rotas de ADMINISTRAÇÃO DA PLATAFORMA (SaaS):
 * SOMENTE SUPER_ADMIN.
 *
 * Usado a nível de router em `/admin` (FASE 27), que gerencia a base de
 * clientes (listagem de estabelecimentos e reset de senha). NEM ADMIN
 * nem MANAGER de um cliente passam por aqui — a regra é estrita e
 * explícita (como `authorizeAdminOnly` acima), nunca implícita por
 * omissão. Todas as rotas internas do grupo herdam a restrição sem
 * repetição rota a rota.
 */
export function authorizeSuperAdminOnly(): RequestHandler {
  return ((req: AuthRequest | any, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.'));
      return;
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      next(new AppError(403, 'FORBIDDEN', 'Permissão insuficiente.'));
      return;
    }

    next();
  }) as any;
}

/**
 * Escape estrito para as rotas de GESTÃO DE EQUIPE: SOMENTE ADMIN.
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
  return ((req: AuthRequest | any, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.'));
      return;
    }

    if (req.user.role !== 'ADMIN') {
      next(new AppError(403, 'FORBIDDEN', 'Permissão insuficiente.'));
      return;
    }

    next();
  }) as any;
}
