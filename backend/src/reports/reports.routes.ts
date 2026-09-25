import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import { auditController } from './reports.controller.js';

/**
 * Rotas privadas de Relatórios.
 * Acesso restrito a MANAGER e ADMIN (visão gerencial, mesmo critério
 * do dashboard). O tenant vem do JWT — nunca de query params.
 */
export const reportsRouter = Router();

reportsRouter.use(authenticate, authorize('MANAGER', 'ADMIN'));

reportsRouter.get('/audit', auditController);
