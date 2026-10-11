import cors from 'cors';
import express, { type Express } from 'express';

import { AppError } from './common/errors/AppError.js';
import { env } from './config/env.js';
import { errorHandler } from './common/middlewares/errorHandler.js';
import { notFound } from './common/middlewares/notFound.js';
import { apiRouter } from './routes/index.js';
import { healthRouter } from './routes/health.js';

/**
 * Instância Express da aplicação.
 *
 * Ordem dos middlewares:
 *  1. cors (lista de origens permitidas via CORS_ORIGIN);
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

/**
 * CORS com allowlist explícita (lê `CORS_ORIGIN` como lista separada por
 * vírgula, com fallback para localhost/127.0.0.1 em desenvolvimento).
 *
 * Por que função em vez de string: com `origin` string, o pacote cors
 * apenas ecoa o valor configurado sem conferir a origem da requisição —
 * se o navegador abriu a SPA em http://127.0.0.1:5173 (resolução de IP do
 * Vite/Node), ele recebe um Access-Control-Allow-Origin que não bate com a
 * origem da página e o preflight é bloqueado. Aqui:
 * - origem ausente (curl, server-to-server): não é navegador → segue;
 * - origem na allowlist: reflete EXATAMENTE a origem da requisição;
 * - origem de fora: 403 CORS_ORIGIN_NOT_ALLOWED (mesmo contrato da API).
 *
 * `exposedHeaders` libera para o JavaScript do navegador headers de resposta
 * que, por padrão, o CORS esconde. `Content-Disposition` é necessário para o
 * frontend ler o nome do arquivo nos downloads (ex.: backup CSV — FASE 28).
 */
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new AppError(403, 'CORS_ORIGIN_NOT_ALLOWED', `Origem não permitida pelo CORS: ${origin}`),
      );
    },
    exposedHeaders: ['Content-Disposition'],
  }),
);
app.use(express.json());

app.use(healthRouter);
app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
