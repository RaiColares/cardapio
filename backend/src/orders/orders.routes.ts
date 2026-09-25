import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  getOrderController,
  listOrdersController,
  updateOrderStatusController,
} from './orders.controller.js';

/**
 * Rotas privadas de operação de Pedidos.
 *
 * Acesso a todas as funções da operação (ADMIN, MANAGER, WAITER,
 * KITCHEN) — a autorização fina (RBAC de transição) é aplicada no
 * service, pois depende do status de destino, não apenas da rota.
 */
export const ordersRouter = Router();

ordersRouter.use(authenticate, authorize('ADMIN', 'MANAGER', 'WAITER', 'KITCHEN'));

ordersRouter.get('/', listOrdersController);
ordersRouter.get('/:id', getOrderController);
ordersRouter.patch('/:id/status', updateOrderStatusController);
