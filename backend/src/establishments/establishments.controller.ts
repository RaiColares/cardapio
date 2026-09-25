import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  registerEstablishmentSchema,
  updateEstablishmentSettingsSchema,
} from './establishments.schemas.js';
import {
  getEstablishmentSettings,
  registerEstablishment,
  updateEstablishmentSettings,
} from './establishments.service.js';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
  }
  return req.user;
}

/**
 * POST /api/v1/establishments/register
 *
 * Onboarding público de novos restaurantes (sem JWT): cria o
 * estabelecimento e o proprietário ADMIN em uma transação.
 */
export async function registerEstablishmentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = registerEstablishmentSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados de cadastro inválidos.',
      );
    }

    const result = await registerEstablishment(parsed.data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/establishments/me
 *
 * Configurações do estabelecimento autenticado (ADMIN/MANAGER).
 * O establishmentId é extraído do token, nunca de parâmetros.
 */
export async function getEstablishmentSettingsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const settings = await getEstablishmentSettings(user.establishmentId);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/establishments/me
 *
 * Atualiza as configurações do estabelecimento (nome, logo, taxa de serviço).
 */
export async function updateEstablishmentSettingsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = updateEstablishmentSettingsSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const settings = await updateEstablishmentSettings(user.establishmentId, parsed.data);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}
