import { Router } from 'express';

import { loginController, registerController } from './auth.controller.js';

export const authRouter = Router();

// POST /api/v1/auth/login — autenticação pública
authRouter.post('/login', loginController);

// POST /api/v1/auth/register — FASE 25: onboarding de clientes SaaS (público)
authRouter.post('/register', registerController);
