import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';

/**
 * Tratador central de erros.
 *
 * Retorna sempre o mesmo contrato:
 * {"success":false,"error":{"code","message"}}
 *
 * Detalhes internos (stack traces) nunca são expostos ao cliente.
 * Erros inesperados são registrados no servidor com o stack trace.
 * Quando o erro traz `details`, eles são mesclados ao objeto `error`
 * (ex.: INSUFFICIENT_PAYMENT informa o `missingAmount`).
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ?? {}),
      },
    });
    return;
  }

  // Erro inesperado: registra internamente, responde 500 genérico.
  console.error('[errorHandler] Erro inesperado:', error);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor.',
    },
  });
}
