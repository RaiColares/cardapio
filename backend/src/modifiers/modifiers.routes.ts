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

modifiersRouter.use(authenticate as any, (authorize as any)('ADMIN', 'MANAGER'));

modifiersRouter.get('/', listModifiersController as any);
modifiersRouter.get('/:id', getModifierController as any);
modifiersRouter.post('/', createModifierController as any);
modifiersRouter.put('/:id', updateModifierController as any);
modifiersRouter.delete('/:id', deleteModifierController as any);
