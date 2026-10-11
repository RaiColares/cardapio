import type { UserRole } from '@prisma/client';
import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  establishmentId: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user: AuthenticatedUser;
}
