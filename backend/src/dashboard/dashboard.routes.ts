import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import { metricsController, salesController, salesExportController } from './dashboard.controller.js';

/**
 * Rotas privadas do Dashboard.
 *
 * Acesso restrito a MANAGER e ADMIN (visão gerencial).
 * O establishmentId é injetado a partir do JWT (multi-tenancy).
 */
export const dashboardRouter = Router();

dashboardRouter.use(authenticate as any, (authorize as any)('MANAGER', 'ADMIN'));

dashboardRouter.get('/metrics', metricsController as any);
dashboardRouter.get('/sales', salesController as any);
dashboardRouter.get('/sales/export', salesExportController as any);
