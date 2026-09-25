import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  meController,
  updateUserController,
} from './users.controller.js';

/**
 * Rotas de Usuários.
 *
 * - GET /me: qualquer role autenticada (perfil próprio).
 * - Demais rotas (CRUD da equipe): SOMENTE ADMIN (FASE 18).
 *
 * REGRA: o `establishmentId` é sempre injetado a partir do JWT. Um ADMIN
 * de A jamais lista/altera usuários de B (multi-tenancy).
 */
export const usersRouter = Router();

// Perfil do próprio usuário: qualquer role autenticada.
// Registrada ANTES do CRUD para que "me" não seja capturada por "/:id".
usersRouter.get('/me', authenticate, meController);

// CRUD da equipe restrito ao ADMIN — establishmentId sempre do token.
usersRouter.use(authenticate, authorize('ADMIN'));

usersRouter.get('/', listUsersController);
usersRouter.get('/:id', getUserController);
usersRouter.post('/', createUserController);
usersRouter.put('/:id', updateUserController);
usersRouter.patch('/:id', updateUserController);
usersRouter.delete('/:id', deleteUserController);
