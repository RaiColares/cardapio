import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  closeSessionController,
  getSessionBillController,
  getSessionReceiptController,
} from './table-sessions.controller.js';

/**
 * Rotas privadas de Comandas (TableSession).
 *
 * Acesso restrito a WAITER, MANAGER e ADMIN (equipe operacional).
 * O establishmentId é injetado a partir do JWT.
 */
export const tableSessionsRouter = Router();

tableSessionsRouter.use(authenticate, authorize('WAITER', 'MANAGER', 'ADMIN'));

tableSessionsRouter.get('/:id/bill', getSessionBillController);
tableSessionsRouter.get('/:id/receipt', getSessionReceiptController);
tableSessionsRouter.post('/:id/close', closeSessionController);
