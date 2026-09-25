import { Router } from 'express';

import { areasRouter } from '../areas/areas.routes.js';
import { authRouter } from '../auth/auth.routes.js';
import { categoriesRouter } from '../categories/categories.routes.js';
import { auditMiddleware } from '../common/middlewares/audit.js';
import { authenticate } from '../common/middlewares/authenticate.js';
import { dashboardRouter } from '../dashboard/dashboard.routes.js';
import { establishmentsRouter } from '../establishments/establishments.routes.js';
import { modifierGroupsRouter } from '../modifier-groups/modifier-groups.routes.js';
import { modifiersRouter } from '../modifiers/modifiers.routes.js';
import { ordersRouter } from '../orders/orders.routes.js';
import { paymentsRouter } from '../payments/payments.routes.js';
import { productsRouter } from '../products/products.routes.js';
import { publicRouter } from '../public/public.routes.js';
import { reportsRouter } from '../reports/reports.routes.js';
import { tableSessionsRouter } from '../table-sessions/table-sessions.routes.js';
import { tablesRouter } from '../tables/tables.routes.js';
import { usersRouter } from '../users/users.routes.js';
import { healthRouter } from './health.js';

/**
 * Rotas da API versionada.
 *
 * Montadas em /api/v1 no app.ts.
 *
 * FASE 22 — Auditoria global (staff):
 * As rotas públicas (/auth/login, /public/*) permanecem SEM autenticação
 * nem auditoria (o cliente não é um usuário do painel). A partir daqui,
 * todas as rotas administrativas passam por `authenticate` global (o
 * usuário autenticado) e pelo `auditMiddleware`, que grava em audit_logs
 * as mutações (POST/PUT/PATCH/DELETE) autenticadas. Os routers de módulo
 * continuam aplicando `authorize(role...)` internamente para a RBAC fina.
 */
export const apiRouter = Router();

// ---- Públicas (cliente móvel + login) ----
apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/public', publicRouter);

// ---- Administrativas (staff autenticado + auditoria) ----
apiRouter.use(authenticate);
apiRouter.use(auditMiddleware);

apiRouter.use('/users', usersRouter);
apiRouter.use('/establishments', establishmentsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/areas', areasRouter);
apiRouter.use('/tables', tablesRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/modifier-groups', modifierGroupsRouter);
apiRouter.use('/modifiers', modifiersRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/table-sessions', tableSessionsRouter);
apiRouter.use('/', paymentsRouter);
apiRouter.use('/reports', reportsRouter);
