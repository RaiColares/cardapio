import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  createAreaController,
  deleteAreaController,
  getAreaController,
  listAreasController,
  updateAreaController,
} from './areas.controller.js';

/**
 * Rotas administrativas de Áreas.
 *
 * Acesso restrito a ADMIN e MANAGER.
 * O establishmentId é injetado a partir do JWT em todos os handlers.
 */
export const areasRouter = Router();

areasRouter.use(authenticate, authorize('ADMIN', 'MANAGER'));

areasRouter.get('/', listAreasController);
areasRouter.get('/:id', getAreaController);
areasRouter.post('/', createAreaController);
areasRouter.put('/:id', updateAreaController);
areasRouter.delete('/:id', deleteAreaController);
