import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  addVariantController,
  availabilityController,
  createProductController,
  deleteProductController,
  deleteVariantController,
  getProductController,
  listProductsController,
  listVariantsController,
  updateProductController,
} from './products.controller.js';

/**
 * Rotas administrativas de Produtos e Variações.
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

// Variações
productsRouter.post('/:id/variants', addVariantController);
productsRouter.get('/:id/variants', listVariantsController);
productsRouter.delete('/:id/variants/:variantId', deleteVariantController);
