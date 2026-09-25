import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  createPaymentController,
  deletePaymentController,
  listSessionPaymentsController,
  transitionPaymentStatusController,
  updatePaymentController,
} from './payments.controller.js';

/**
 * Rotas privadas de Pagamentos.
 *
 * Acesso restrito a WAITER, MANAGER e ADMIN.
 * O tenant é validado via TableSession + JWT.
 *
 * NOTA: o middleware de autenticação é aplicado POR ROTA (não um
 * use() global no router) — o router é montado em '/' no index e
 * um use() sem path interceptaria todas as demais rotas da API.
 */
export const paymentsRouter = Router();

paymentsRouter.get('/table-sessions/:id/payments', authenticate, authorize('WAITER', 'MANAGER', 'ADMIN'), listSessionPaymentsController);
paymentsRouter.post('/table-sessions/:id/payments', authenticate, authorize('WAITER', 'MANAGER', 'ADMIN'), createPaymentController);
paymentsRouter.patch('/payments/:id', authenticate, authorize('WAITER', 'MANAGER', 'ADMIN'), updatePaymentController);
paymentsRouter.patch('/payments/:id/status', authenticate, authorize('WAITER', 'MANAGER', 'ADMIN'), transitionPaymentStatusController);
paymentsRouter.delete('/payments/:id', authenticate, authorize('WAITER', 'MANAGER', 'ADMIN'), deletePaymentController);
