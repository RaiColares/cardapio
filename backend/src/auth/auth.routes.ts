import { Router } from 'express';

import { loginController } from './auth.controller.js';

export const authRouter = Router();

// POST /api/v1/auth/login — autenticação pública
authRouter.post('/login', loginController);
