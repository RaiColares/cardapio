import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  createModifierController,
  deleteModifierController,
  getModifierController,
  listModifiersController,
  updateModifierController,
} from './modifiers.controller.js';

/**
 * Rotas administrativas de Adicionais (Modifier).
 *
 * Acesso restrito a ADMIN e MANAGER.
 * O vínculo com o establishment é garantido pelo grupo + JWT.
 */
export const modifiersRouter = Router();

modifiersRouter.use(authenticate, authorize('ADMIN', 'MANAGER'));

modifiersRouter.get('/', listModifiersController);
modifiersRouter.get('/:id', getModifierController);
modifiersRouter.post('/', createModifierController);
modifiersRouter.put('/:id', updateModifierController);
modifiersRouter.delete('/:id', deleteModifierController);
