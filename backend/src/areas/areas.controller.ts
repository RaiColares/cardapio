import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  areaIdParamSchema,
  createAreaSchema,
  updateAreaSchema,
} from './areas.schemas.js';
import {
  createArea,
  deleteArea,
  getAreaById,
  listAreas,
  updateArea,
} from './areas.service.js';

/** GET /api/v1/areas — lista áreas do estabelecimento autenticado */
export async function listAreasController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const areas = await listAreas(req.user.establishmentId);
    res.json({ success: true, data: areas });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/areas/:id — detalhe de uma área */
export async function getAreaController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = areaIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const area = await getAreaById(params.data.id, req.user.establishmentId);
    res.json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/areas — cria uma área */
export async function createAreaController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const body = createAreaSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const area = await createArea(body.data, req.user.establishmentId);
    res.status(201).json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/v1/areas/:id — atualiza uma área */
export async function updateAreaController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = areaIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = updateAreaSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const area = await updateArea(params.data.id, body.data, req.user.establishmentId);
    res.json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/areas/:id — remove uma área */
export async function deleteAreaController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = areaIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    await deleteArea(params.data.id, req.user.establishmentId);
    res.json({ success: true, data: { id: params.data.id } });
  } catch (error) {
    next(error);
  }
}
