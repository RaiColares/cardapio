import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  createTableSchema,
  setTableWaitersSchema,
  tableIdParamSchema,
  updateTableSchema,
} from './tables.schemas.js';
import {
  assignTableWaiters,
  createTable,
  deleteTable,
  getTableById,
  listTables,
  updateTable,
} from './tables.service.js';

/** GET /api/v1/tables — lista mesas do estabelecimento autenticado */
export async function listTablesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const areaId = typeof req.query.areaId === 'string' ? req.query.areaId : undefined;

    const tables = await listTables(req.user.establishmentId, areaId, req.user);
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/tables/:id — detalhe de uma mesa */
export async function getTableController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = tableIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const table = await getTableById(params.data.id, req.user.establishmentId, req.user);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/tables — cria uma mesa (qrCode gerado automaticamente) */
export async function createTableController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const body = createTableSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const table = await createTable(body.data, req.user.establishmentId);
    res.status(201).json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/v1/tables/:id — atualiza uma mesa */
export async function updateTableController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = tableIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = updateTableSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const table = await updateTable(params.data.id, body.data, req.user.establishmentId);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/tables/:id — remove uma mesa */
export async function deleteTableController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = tableIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    await deleteTable(params.data.id, req.user.establishmentId);
    res.json({ success: true, data: { id: params.data.id } });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/tables/:id/waiters — vincula (substitui) os garçons da mesa.
 *
 * Restrito a MANAGER/ADMIN. `userIds: []` limpa o vínculo.
 */
export async function assignTableWaitersController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = tableIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = setTableWaitersSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const table = await assignTableWaiters(
      params.data.id,
      body.data.userIds,
      req.user.establishmentId,
    );

    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
}
