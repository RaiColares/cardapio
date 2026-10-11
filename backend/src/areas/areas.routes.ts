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

areasRouter.use(authenticate as any, (authorize as any)('ADMIN', 'MANAGER'));

areasRouter.get('/', listAreasController as any);
areasRouter.get('/:id', getAreaController as any);
areasRouter.post('/', createAreaController as any);
areasRouter.put('/:id', updateAreaController as any);
areasRouter.delete('/:id', deleteAreaController as any);
