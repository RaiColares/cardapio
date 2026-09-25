import { Router } from 'express';

/**
 * Rota de saúde da aplicação.
 *
 * Exposta em duas posições:
 *  - GET /health            (sem prefixo, para orquestradores/load balancers)
 *  - GET /api/v1/health     (via routes/index.ts, dentro da API versionada)
 */
export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
    },
  });
});
