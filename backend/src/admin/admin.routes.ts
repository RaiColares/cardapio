import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorizeSuperAdminOnly } from '../common/middlewares/authorize.js';
import {
  authorizeClientEmailController,
  deleteEstablishmentController,
  listEstablishmentsController,
  updateClientPasswordController,
  updateClientStatusController,
} from './admin.controller.js';

/**
 * Rotas de ADMINISTRAÇÃO DA PLATAFORMA (FASE 27).
 *
 * Grupo restrito ESTRITAMENTE a SUPER_ADMIN:
 * - `authenticate` + `authorizeSuperAdminOnly` aplicados a nível de router
 *   (defesa em profundidade — o `authenticate` global de /api/v1 já exige
 *   token válido ANTES de chegar aqui);
 * - ADMIN/MANAGER/WAITER/KITCHEN recebem 403 FORBIDDEN em qualquer rota
 *   deste grupo;
 * - o `auditMiddleware` global registra as mutações (POST/PATCH) com o
 *   body saneado (o campo `password` é descartado; e-mail/isActive são
 *   registrados por serem dados não sensíveis).
 *
 * Todas as rotas são de escopo GLOBAL (não há tenant).
 */
export const adminRouter = Router();

adminRouter.use(authenticate, authorizeSuperAdminOnly());

// GET /api/v1/admin/establishments — listagem de clientes cadastrados.
adminRouter.get('/establishments', listEstablishmentsController);

// POST /api/v1/admin/authorized-emails — autoriza e-mail para onboarding SaaS.
adminRouter.post('/authorized-emails', authorizeClientEmailController);

// PATCH /api/v1/admin/establishments/:id/password — reset de senha do cliente.
adminRouter.patch(
  '/establishments/:id/password',
  updateClientPasswordController,
);

// PATCH /api/v1/admin/establishments/:id/status — suspende/reativa o cliente.
adminRouter.patch(
  '/establishments/:id/status',
  updateClientStatusController,
);

// DELETE /api/v1/admin/establishments/:id — exclusão DEFINITIVA do cliente
// (cascade em todos os dados vinculados; irreversível).
adminRouter.delete('/establishments/:id', deleteEstablishmentController);