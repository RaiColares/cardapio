import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  createModifierGroupSchema,
  modifierGroupIdParamSchema,
  updateModifierGroupSchema,
} from './modifier-groups.schemas.js';
import {
  createModifierGroup,
  deleteModifierGroup,
  getModifierGroupById,
  listModifierGroups,
  updateModifierGroup,
} from './modifier-groups.service.js';

/** GET /api/v1/modifier-groups — lista grupos do estabelecimento autenticado */
export async function listModifierGroupsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const groups = await listModifierGroups(req.user.establishmentId);
    res.json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/modifier-groups/:id — detalhe do grupo */
export async function getModifierGroupController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = modifierGroupIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const group = await getModifierGroupById(
      params.data.id,
      req.user.establishmentId,
    );
    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/modifier-groups — cria um grupo */
export async function createModifierGroupController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const body = createModifierGroupSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const group = await createModifierGroup(
      body.data,
      req.user.establishmentId,
    );
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/v1/modifier-groups/:id — atualiza um grupo */
export async function updateModifierGroupController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = modifierGroupIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = updateModifierGroupSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const group = await updateModifierGroup(
      params.data.id,
      body.data,
      req.user.establishmentId,
    );
    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/modifier-groups/:id — remove um grupo */
export async function deleteModifierGroupController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = modifierGroupIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    await deleteModifierGroup(params.data.id, req.user.establishmentId);
    res.json({ success: true, data: { id: params.data.id } });
  } catch (error) {
    next(error);
  }
}
