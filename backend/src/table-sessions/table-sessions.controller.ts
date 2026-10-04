import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  sessionAdjustmentsSchema,
  sessionIdParamsSchema,
} from './table-sessions.schemas.js';
import {
  closeSession,
  getSessionBill,
  getSessionReceipt,
  updateSessionAdjustments,
} from './table-sessions.service.js';

/** GET /api/v1/table-sessions/:id/bill — resumo financeiro da comanda */
export async function getSessionBillController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = sessionIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const bill = await getSessionBill(
      params.data.id,
      req.user.establishmentId,
    );
    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/table-sessions/:id/receipt
 * Comprovante não-oficial consolidado da comanda (privado).
 */
export async function getSessionReceiptController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = sessionIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const receipt = await getSessionReceipt(
      params.data.id,
      req.user.establishmentId,
    );
    res.json({ success: true, data: { receipt } });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/table-sessions/:id/close — fechamento atômico da comanda */
export async function closeSessionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = sessionIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const result = await closeSession(
      params.data.id,
      req.user.establishmentId,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/table-sessions/:id/adjustments
 *
 * Guarda desconto/acréscimo/observação manuais da comanda e devolve o
 * bill recalculado (o servidor é a autoridade sobre o total).
 */
export async function updateSessionAdjustmentsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = sessionIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = sessionAdjustmentsSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const bill = await updateSessionAdjustments(
      params.data.id,
      body.data,
      req.user.establishmentId,
    );

    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
}
