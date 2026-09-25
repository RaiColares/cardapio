import { Router } from 'express';

import {
  createPublicOrderController,
  getPublicOrderController,
  getSessionOrdersController,
  menuController,
  publicReceiptController,
  requestBillController,
  tableController,
} from './public.controller.js';

/**
 * Rotas públicas do cliente — NÃO exigem JWT.
 *
 * Endpoints protegidos contra abuso por validação de payload e
 * recálculo de preços no servidor (regra de ouro).
 */
export const publicRouter = Router();

publicRouter.get('/menu/:slug', menuController);
publicRouter.get('/table/:qrCode', tableController);
publicRouter.post('/orders', createPublicOrderController);
publicRouter.post('/table-sessions/:sessionToken/request-bill', requestBillController);
publicRouter.get('/table-sessions/:sessionToken/orders', getSessionOrdersController);
publicRouter.get('/table-sessions/:sessionToken/receipt', publicReceiptController);
publicRouter.get('/orders/:id', getPublicOrderController);
