import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import { loginSchema } from './auth.schemas.js';
import { loginWithCredentials } from './auth.service.js';

/**
 * POST /api/v1/auth/login
 *
 * Recebe { email, password }, executa a regra de negócio de
 * autenticação no service e responde com o token JWT.
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados de login inválidos.',
      );
    }

    const result = await loginWithCredentials(parsed.data);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
