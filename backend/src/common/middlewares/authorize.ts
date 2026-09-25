import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';

/**
 * Middleware de autorização baseado em roles (RBAC).
 *
 * Uso: authorize('ADMIN', 'MANAGER')
 *
 * Deve ser aplicado SEMPRE após o authenticate.
 * A função verifica se a role do usuário autenticado está entre
 * as permitidas para a rota.
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Permissão insuficiente.'));
      return;
    }

    next();
  };
}
