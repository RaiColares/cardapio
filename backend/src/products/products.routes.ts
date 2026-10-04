import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  availabilityController,
  createProductController,
  deleteProductController,
  getProductController,
  listProductsController,
  updateProductController,
} from './products.controller.js';

/**
 * Rotas administrativas de Produtos.
 *
 * Acesso restrito a ADMIN e MANAGER.
 * O establishmentId é injetado a partir do JWT em todos os handlers.
 */
export const productsRouter = Router();

productsRouter.use(authenticate, authorize('ADMIN', 'MANAGER'));

productsRouter.get('/', listProductsController);
productsRouter.get('/:id', getProductController);
productsRouter.post('/', createProductController);
productsRouter.put('/:id', updateProductController);
productsRouter.patch('/:id/availability', availabilityController);
productsRouter.delete('/:id', deleteProductController);
