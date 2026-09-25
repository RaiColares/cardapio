import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryController,
  listCategoriesController,
  updateCategoryController,
} from './categories.controller.js';

/**
 * Rotas administrativas de Categorias.
 *
 * Acesso restrito a ADMIN e MANAGER.
 * O establishmentId é injetado a partir do JWT em todos os handlers.
 */
export const categoriesRouter = Router();

categoriesRouter.use(authenticate, authorize('ADMIN', 'MANAGER'));

categoriesRouter.get('/', listCategoriesController);
categoriesRouter.get('/:id', getCategoryController);
categoriesRouter.post('/', createCategoryController);
categoriesRouter.put('/:id', updateCategoryController);
categoriesRouter.delete('/:id', deleteCategoryController);
