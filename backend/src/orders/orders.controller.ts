import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from './orders.schemas.js';
import {
  getOperationalOrderById,
  listOperationalOrders,
  updateOrderStatus,
} from './orders.service.js';

/** GET /api/v1/orders — lista pedidos operacionais do estabelecimento */
export async function listOrdersController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const query = listOrdersQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        query.error.issues[0]?.message ?? 'Query inválida.',
      );
    }

    const orders = await listOperationalOrders(
      req.user.establishmentId,
      query.data,
      req.user.role,
    );
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/orders/:id — detalhe operacional de um pedido */
export async function getOrderController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = orderIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const order = await getOperationalOrderById(
      params.data.id,
      req.user.establishmentId,
    );
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/orders/:id/status
 *
 * Transição de status com máquina de estados + RBAC de transição.
 * A role do usuário autenticado é verificada contra o status de
 * destino (ex.: KITCHEN pode PREPARING/READY; WAITER CONFIRMED/DELIVERED).
 */
export async function updateOrderStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const params = orderIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = updateOrderStatusSchema.safeParse(req.body);

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const order = await updateOrderStatus(
      params.data.id,
      body.data,
      req.user.establishmentId,
      req.user.role,
    );
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}
