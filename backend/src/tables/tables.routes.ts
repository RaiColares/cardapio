import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import { authorize } from '../common/middlewares/authorize.js';
import {
  assignTableWaitersController,
  createTableController,
  deleteTableController,
  getTableController,
  listTablesController,
  updateTableController,
} from './tables.controller.js';

/**
 * Rotas de Mesas.
 *
 * FASE 23 — Leitura separada de escrita:
 * - LEITURA (GET /, GET /:id): liberada para a OPERAÇÃO. O salão do
 *   garçom (`/waiter`) precisa listar as mesas para tocar comandas,
 *   acompanhar o Delivery e abrir a conta — antes disso o WAITER recebia
 *   403 FORBIDDEN "Permissão insuficiente" ao abrir o painel.
 *   ADMIN/MANAGER acessam automaticamente (papéis elevados).
 * - ESCRITA (POST/PUT/DELETE): continua EXCLUSIVA de ADMIN/MANAGER.
 *   O WAITER apenas enxerga as mesas; não cria, edita nem remove —
 *   a allowlist de escrita não inclui WAITER/KITCHEN.
 *
 * O `establishmentId` é injetado a partir do JWT em todos os handlers:
 * um garçom de A jamais vê as mesas de B (multi-tenancy).
 */
export const tablesRouter = Router();

tablesRouter.use(authenticate as any);

// ---- Leitura (operação + gestão) ----
tablesRouter.get('/', (authorize as any)('WAITER', 'MANAGER', 'ADMIN'), listTablesController as any);
tablesRouter.get('/:id', (authorize as any)('WAITER', 'MANAGER', 'ADMIN'), getTableController as any);

// ---- Escrita (gestão) ----
tablesRouter.post('/', (authorize as any)('MANAGER', 'ADMIN'), createTableController as any);
tablesRouter.put('/:id', (authorize as any)('MANAGER', 'ADMIN'), updateTableController as any);
tablesRouter.delete('/:id', (authorize as any)('MANAGER', 'ADMIN'), deleteTableController as any);

// FASE 23 — Vínculo de garçons (NxN). Somente gestão.
tablesRouter.put(
  '/:id/waiters',
  (authorize as any)('MANAGER', 'ADMIN'),
  assignTableWaitersController as any,
);
