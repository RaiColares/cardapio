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

publicRouter.get('/menu/:slug', menuController as any);
publicRouter.get('/table/:qrCode', tableController as any);
publicRouter.post('/orders', createPublicOrderController as any);
publicRouter.post('/table-sessions/:sessionToken/request-bill', requestBillController as any);
publicRouter.get('/table-sessions/:sessionToken/orders', getSessionOrdersController as any);
publicRouter.get('/table-sessions/:sessionToken/receipt', publicReceiptController as any);
publicRouter.get('/orders/:id', getPublicOrderController as any);
