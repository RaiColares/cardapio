import type { UserRole } from '@prisma/client';

/**
 * Extensão do Request do Express.
 *
 * O usuário autenticado (injetado pelo middleware authenticate)
 * fica disponível em req.user.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        establishmentId: string;
        role: UserRole;
      };
    }
  }
}

export {};
