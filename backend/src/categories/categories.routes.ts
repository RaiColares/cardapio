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

categoriesRouter.use(authenticate as any, (authorize as any)('ADMIN', 'MANAGER'));

categoriesRouter.get('/', listCategoriesController as any);
categoriesRouter.get('/:id', getCategoryController as any);
categoriesRouter.post('/', createCategoryController as any);
categoriesRouter.put('/:id', updateCategoryController as any);
categoriesRouter.delete('/:id', deleteCategoryController as any);
