import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorizeAdminOnly } from '../common/middlewares/authorize.js';
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
 * EXCEÇÃO DOCUMENTADA à regra dos papéis elevados (ADMIN/MANAGER com
 * acesso irrestrito às rotas OPERACIONAIS): a gestão de equipe NÃO é
 * operacional. O MANAGER não administra credenciais de outros gestores —
 * usa-se `authorizeAdminOnly()`, que ignora o bypass dos papéis elevados.
 * Proteções complementares no service: `teamRoles` nunca cria ADMIN e
 * CANNOT_MODIFY_ADMIN/CANNOT_DELETE_ADMIN protegem o usuário dono.
 *
 * REGRA: o `establishmentId` é sempre injetado a partir do JWT. Um ADMIN
 * de A jamais lista/altera usuários de B (multi-tenancy).
 */
export const usersRouter = Router();

// Perfil do próprio usuário: qualquer role autenticada.
// Registrada ANTES do CRUD para que "me" não seja capturada por "/:id".
usersRouter.get('/me', authenticate, meController);

// CRUD da equipe restrito ao ADMIN — establishmentId sempre do token.
usersRouter.use(authenticate, authorizeAdminOnly());

usersRouter.get('/', listUsersController);
usersRouter.get('/:id', getUserController);
usersRouter.post('/', createUserController);
usersRouter.put('/:id', updateUserController);
usersRouter.patch('/:id', updateUserController);
usersRouter.delete('/:id', deleteUserController);
