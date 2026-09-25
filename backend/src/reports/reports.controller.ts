import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import { getAuditLogs } from './reports.service.js';

/** GET /api/v1/reports/audit — últimas 100 ações do estabelecimento */
export async function auditController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
    }

    const logs = await getAuditLogs(req.user.establishmentId);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
}
