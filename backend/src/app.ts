import cors from 'cors';
import express, { type Express } from 'express';

import { env } from './config/env.js';
import { errorHandler } from './common/middlewares/errorHandler.js';
import { notFound } from './common/middlewares/notFound.js';
import { apiRouter } from './routes/index.js';
import { healthRouter } from './routes/health.js';

/**
 * Instância Express da aplicação.
 *
 * Ordem dos middlewares:
 *  1. cors (origem via ambiente);
 *  2. json (parsing de corpo);
 *  3. rotas de saúde (sem prefixo);
 *  4. API versionada em /api/v1 — a divisão público/staff e a auditoria
 *     global de mutações autenticadas ficam dentro do apiRouter
 *     (routes/index.ts), que aplica authenticate + auditMiddleware antes
 *     das rotas administrativas;
 *  5. 404;
 *  6. tratamento centralizado de erros.
 */
const app: Express = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use(healthRouter);
app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
