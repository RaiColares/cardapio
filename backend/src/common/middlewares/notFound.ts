import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';

/**
 * Middleware de rota não encontrada.
 *
 * Encaminha um AppError(404) para o errorHandler, garantindo que
 * o 404 siga o mesmo contrato de erro da API.
 */
export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada.'));
}
