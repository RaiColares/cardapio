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

dashboardRouter.use(authenticate, authorize('MANAGER', 'ADMIN'));

dashboardRouter.get('/metrics', metricsController);
dashboardRouter.get('/sales', salesController);
dashboardRouter.get('/sales/export', salesExportController);
