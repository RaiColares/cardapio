import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize, authorizeAdminOnly } from '../common/middlewares/authorize.js';
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
 * - GET /: ADMIN e MANAGER (FASE 23). O MANAGER precisa listar a equipe
 *   operacional (WAITER/KITCHEN) para vincular garçons às mesas; o service
 *   restringe a resposta do MANAGER a esses papéis.
 * - POST / e PUT|PATCH /:id: ADMIN e MANAGER (FASE 24). O MANAGER pode
 *   gerir a equipe operacional, mas o service bloqueia (403) a criação ou
 *   rebaixamento para ADMIN/MANAGER — o MANAGER só cria/edita
 *   WAITER/KITCHEN.
 * - GET /:id e DELETE /:id: somente ADMIN (gerir credenciais de outros
 *   gestores continua fora do escopo do MANAGER).
 *
 * EXCEÇÃO DOCUMENTADA à regra dos papéis elevados (ADMIN/MANAGER com
 * acesso irrestrito às rotas OPERACIONAIS): a gestão de equipe NÃO é
 * operacional. O acesso do MANAGER é liberado explicitamente rota a rota
 * e a RBAC fina (papéis que o MANAGER pode gerir) vive no service.
 *
 * REGRA: o `establishmentId` é sempre injetado a partir do JWT. Um usuário
 * de A jamais lista/altera usuários de B (multi-tenancy).
 */
export const usersRouter = Router();

// Perfil do próprio usuário: qualquer role autenticada.
// Registrada ANTES do CRUD para que "me" não seja capturada por "/:id".
usersRouter.get('/me', authenticate, meController);

// Listagem da equipe: ADMIN (todos) e MANAGER (apenas WAITER/KITCHEN).
usersRouter.get('/', authenticate, authorize('ADMIN', 'MANAGER'), listUsersController);

// CRUD da equipe — establishmentId sempre do token (multi-tenancy).
// Criação/edição: ADMIN e MANAGER (MANAGER restrito a WAITER/KITCHEN no service).
usersRouter.post('/', authenticate, authorize('ADMIN', 'MANAGER'), createUserController);
usersRouter.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), updateUserController);
usersRouter.patch('/:id', authenticate, authorize('ADMIN', 'MANAGER'), updateUserController);

// Detalhe e exclusão continuam ADMIN-only (gestão de gestores).
usersRouter.get('/:id', authenticate, authorizeAdminOnly(), getUserController);
usersRouter.delete('/:id', authenticate, authorizeAdminOnly(), deleteUserController);
