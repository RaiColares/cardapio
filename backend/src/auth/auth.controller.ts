import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { loginWithCredentials, registerEstablishmentWithOwner } from './auth.service.js';

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

/**
 * POST /api/v1/auth/register — FASE 25 (onboarding de clientes SaaS)
 *
 * Rota pública (sem JWT). Recebe { establishmentName, slug, ownerName,
 * email, password }, cria o Establishment (configurações padrão de
 * pagamento) e o User proprietário (role ADMIN) atomicamente em uma
 * transação e responde com mensagem de sucesso.
 */
export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados de cadastro inválidos.',
      );
    }

    const result = await registerEstablishmentWithOwner(parsed.data);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
