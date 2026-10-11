import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorizeAdminOnly } from '../common/middlewares/authorize.js';
import { exportCsvController } from './export.controller.js';

/**
 * Rotas privadas de Exportação (backup de dados do cliente).
 *
 * Auth: `authenticate` + `(authorizeAdminOnly() as any)` — **exclusivo de ADMIN**.
 * Diferente das rotas operacionais, o backup NÃO é liberado a MANAGER
 * (nem a papéis elevados por `ELEVATED_ROLES`): ele carrega dados de
 * equipe (e-mails/papéis) e configuração completa do estabelecimento.
 *
 * O tenant vem SEMPRE do JWT — nunca de query/body.
 */
export const exportRouter = Router();

exportRouter.use(authenticate as any, (authorizeAdminOnly() as any));

exportRouter.get('/csv', exportCsvController as any);
