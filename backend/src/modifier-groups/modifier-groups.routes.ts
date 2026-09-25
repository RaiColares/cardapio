import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  createModifierGroupController,
  deleteModifierGroupController,
  getModifierGroupController,
  listModifierGroupsController,
  updateModifierGroupController,
} from './modifier-groups.controller.js';

/**
 * Rotas administrativas de Grupos de Adicionais.
 *
 * Acesso restrito a ADMIN e MANAGER.
 * O establishmentId é injetado a partir do JWT em todos os handlers.
 */
export const modifierGroupsRouter = Router();

modifierGroupsRouter.use(authenticate, authorize('ADMIN', 'MANAGER'));

modifierGroupsRouter.get('/', listModifierGroupsController);
modifierGroupsRouter.get('/:id', getModifierGroupController);
modifierGroupsRouter.post('/', createModifierGroupController);
modifierGroupsRouter.put('/:id', updateModifierGroupController);
modifierGroupsRouter.delete('/:id', deleteModifierGroupController);
