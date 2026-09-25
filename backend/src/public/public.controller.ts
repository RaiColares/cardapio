import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import {
  createPublicOrderSchema,
  menuParamsSchema,
  orderIdParamSchema,
  requestBillBodySchema,
  sessionTokenParamsSchema,
  tableParamsSchema,
} from './public.schemas.js';
import {
  getPublicOrderById,
  getPublicSessionOrders,
} from './public.orders.service.js';
import { getPublicSessionReceipt } from '../table-sessions/table-sessions.service.js';
import { requestBill } from '../table-sessions/table-sessions.service.js';
import {
  createPublicOrder,
  getOrCreateTableSession,
  getPublicMenu,
} from './public.service.js';

/**
 * Endpoints públicos do cliente (sem JWT).
 *
 * Proteção contra abuso: schemas restringem tamanho/quantidade e
 * todos os preços são recalculados no servidor.
 */

/** GET /api/v1/public/menu/:slug */
export async function menuController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = menuParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const result = await getPublicMenu(params.data.slug);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/public/table/:qrCode */
export async function tableController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = tableParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const result = await getOrCreateTableSession(params.data.qrCode);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/public/orders/:id — rastreio do pedido pelo cliente */
export async function getPublicOrderController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = orderIdParamSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const result = await getPublicOrderById(params.data.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/public/table-sessions/:sessionToken/request-bill */
export async function requestBillController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = sessionTokenParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const body = requestBillBodySchema.safeParse(req.body ?? {});

    if (!body.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        body.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const result = await requestBill(params.data.sessionToken, body.data);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/public/table-sessions/:sessionToken/receipt — comprovante do cliente */
export async function publicReceiptController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = sessionTokenParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const receipt = await getPublicSessionReceipt(params.data.sessionToken);
    res.json({ success: true, data: { receipt } });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/public/table-sessions/:sessionToken/orders — extrato da comanda */
export async function getSessionOrdersController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = sessionTokenParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        params.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const result = await getPublicSessionOrders(params.data.sessionToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/public/orders */
export async function createPublicOrderController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createPublicOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const result = await createPublicOrder(parsed.data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
