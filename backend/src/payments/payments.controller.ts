import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  createPaymentSchema,
  paymentIdParamSchema,
  sessionIdParamSchema,
  transitionPaymentStatusSchema,
  updatePaymentSchema,
} from './payments.schemas.js';
import {
  createPayment,
  deletePayment,
  listSessionPayments,
  transitionPaymentStatus,
  updatePayment,
} from './payments.service.js';

/** GET /api/v1/table-sessions/:id/payments — lista pagamentos da comanda */
export async function listSessionPaymentsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = sessionIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const result = await listSessionPayments(
      params.data.id,
      req.user.establishmentId,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/table-sessions/:id/payments — registra pagamento na comanda */
export async function createPaymentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = sessionIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = createPaymentSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const payment = await createPayment(
      params.data.id,
      body.data,
      req.user.establishmentId,
    );
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/v1/payments/:id — atualiza dados de um pagamento da comanda */
export async function updatePaymentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = paymentIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = updatePaymentSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const payment = await updatePayment(
      params.data.id,
      body.data,
      req.user.establishmentId,
    );
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/payments/:id/status
 *
 * Transição de status na máquina de estados de pagamentos.
 * Acesso restrito a WAITER, MANAGER e ADMIN.
 */
export async function transitionPaymentStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = paymentIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = transitionPaymentStatusSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const payment = await transitionPaymentStatus(
      params.data.id,
      body.data.status,
      req.user.establishmentId,
    );
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/payments/:id — estorno de lançamento (MANAGER/ADMIN).
 * Remove o pagamento e devolve o saldo recalculado da comanda.
 */
export async function deletePaymentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = paymentIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const result = await deletePayment(params.data.id, req.user.establishmentId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
