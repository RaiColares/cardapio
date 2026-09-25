import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  createTableController,
  deleteTableController,
  getTableController,
  listTablesController,
  updateTableController,
} from './tables.controller.js';

/**
 * Rotas administrativas de Mesas.
 *
 * Acesso restrito a ADMIN e MANAGER.
 * O establishmentId é injetado a partir do JWT em todos os handlers.
 */
export const tablesRouter = Router();

tablesRouter.use(authenticate, authorize('ADMIN', 'MANAGER'));

tablesRouter.get('/', listTablesController);
tablesRouter.get('/:id', getTableController);
tablesRouter.post('/', createTableController);
tablesRouter.put('/:id', updateTableController);
tablesRouter.delete('/:id', deleteTableController);
