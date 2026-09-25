import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  createModifierSchema,
  listModifiersQuerySchema,
  modifierIdParamSchema,
  updateModifierSchema,
} from './modifiers.schemas.js';
import {
  createModifier,
  deleteModifier,
  getModifierById,
  listModifiers,
  updateModifier,
} from './modifiers.service.js';

/** GET /api/v1/modifiers — lista adicionais do estabelecimento autenticado */
export async function listModifiersController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const query = listModifiersQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        query.error.issues[0]?.message ?? 'Query inválida.',
      );
    }

    const modifiers = await listModifiers(
      req.user.establishmentId,
      query.data.modifierGroupId,
      query.data.active,
    );
    res.json({ success: true, data: modifiers });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/modifiers/:id — detalhe de um adicional */
export async function getModifierController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = modifierIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const modifier = await getModifierById(
      params.data.id,
      req.user.establishmentId,
    );
    res.json({ success: true, data: modifier });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/modifiers — cria um adicional */
export async function createModifierController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const body = createModifierSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const modifier = await createModifier(
      body.data,
      req.user.establishmentId,
    );
    res.status(201).json({ success: true, data: modifier });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/v1/modifiers/:id — atualiza um adicional */
export async function updateModifierController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = modifierIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = updateModifierSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const modifier = await updateModifier(
      params.data.id,
      body.data,
      req.user.establishmentId,
    );
    res.json({ success: true, data: modifier });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/modifiers/:id — remove um adicional */
export async function deleteModifierController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = modifierIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    await deleteModifier(params.data.id, req.user.establishmentId);
    res.json({ success: true, data: { id: params.data.id } });
  } catch (error) {
    next(error);
  }
}
