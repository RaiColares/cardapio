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

modifierGroupsRouter.use(authenticate as any, (authorize as any)('ADMIN', 'MANAGER'));

modifierGroupsRouter.get('/', listModifierGroupsController as any);
modifierGroupsRouter.get('/:id', getModifierGroupController as any);
modifierGroupsRouter.post('/', createModifierGroupController as any);
modifierGroupsRouter.put('/:id', updateModifierGroupController as any);
modifierGroupsRouter.delete('/:id', deleteModifierGroupController as any);
