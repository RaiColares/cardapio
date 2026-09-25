import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../auth/jwt.js';

/**
 * Middleware de autenticação.
 *
 * Extrai o Bearer token do header Authorization, valida assinatura,
 * expiração e estrutura do JWT e anexa o usuário autenticado em req.user.
 *
 * req.user = { userId, establishmentId, role }
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization;

  if (!authorization) {
    next(new AppError(401, 'AUTH_REQUIRED', 'Token de autenticação ausente.'));
    return;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(new AppError(401, 'AUTH_REQUIRED', 'Token de autenticação inválido.'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.sub,
      establishmentId: payload.establishmentId,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
