import { Router } from 'express';

import { authenticate } from '../common/middlewares/authenticate.js';
import {
  loginController,
  meController,
  registerController,
} from './auth.controller.js';

export const authRouter = Router();

// POST /api/v1/auth/login — autenticação pública
authRouter.post('/login', loginController);

// POST /api/v1/auth/register — FASE 25: onboarding de clientes SaaS (público)
authRouter.post('/register', registerController);

// GET /api/v1/auth/me — usuário logado + branding do estabelecimento
// (autenticado; o router /auth é montado antes do authenticate global,
// então o middleware é aplicado explicitamente aqui).
authRouter.get('/me', authenticate, meController);
