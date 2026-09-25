import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

import { AppError } from '../errors/AppError.js';
import { env } from '../../config/env.js';

/**
 * Payload do access token.
 *
 * Contém obrigatoriamente:
 *  - sub: userId
 *  - establishmentId
 *  - role
 *
 * Apenas essas três informações são necessárias para autenticação
 * e autorização. Dados sensíveis/adicionais não são embutidos.
 */
export type AccessTokenPayload = {
  sub: string;
  establishmentId: string;
  role: UserRole;
};

const VALID_ROLES = new Set<string>(Object.values(UserRole));

/**
 * Assina um access token JWT.
 * O segredo vem do ambiente (nunca do código/cliente).
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifica assinatura, expiração e estrutura do token.
 *
 * Lança AppError(401) com código estável para cada falha:
 *  - ausência já é tratada pelo middleware;
 *  - token malformado/assinatura inválida;
 *  - token expirado.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    if (typeof decoded === 'string') {
      throw new AppError(401, 'INVALID_TOKEN', 'Token inválido.');
    }

    const { sub, establishmentId, role } = decoded as jwt.JwtPayload;

    if (
      typeof sub !== 'string' ||
      typeof establishmentId !== 'string' ||
      typeof role !== 'string' ||
      !VALID_ROLES.has(role)
    ) {
      throw new AppError(401, 'INVALID_TOKEN', 'Token inválido.');
    }

    return { sub, establishmentId, role: role as UserRole };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Sessão expirada. Faça login novamente.');
    }

    throw new AppError(401, 'INVALID_TOKEN', 'Token inválido.');
  }
}
