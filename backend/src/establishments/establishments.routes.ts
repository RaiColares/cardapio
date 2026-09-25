import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  getEstablishmentSettingsController,
  registerEstablishmentController,
  updateEstablishmentSettingsController,
} from './establishments.controller.js';

/**
 * Rotas de Estabelecimentos.
 *
 * - POST /register: público — onboarding SaaS (sem JWT).
 * - GET/PUT /me: protegidas (ADMIN e MANAGER); o tenant é extraído do JWT.
 */
export const establishmentsRouter = Router();

// Onboarding público — novo restaurante + proprietário ADMIN.
establishmentsRouter.post('/register', registerEstablishmentController);

// Configurações do próprio estabelecimento (multi-tenancy via JWT).
establishmentsRouter.get(
  '/me',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  getEstablishmentSettingsController,
);
establishmentsRouter.put(
  '/me',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  updateEstablishmentSettingsController,
);
