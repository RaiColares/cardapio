import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/AppError.js';
import { createUserSchema, updateUserSchema, userIdParamSchema } from './users.schemas.js';
import {
  createUser,
  deleteUser,
  getMe,
  getUserById,
  listUsers,
  updateUser,
} from './users.service.js';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');
  }
  return req.user;
}

/**
 * GET /api/v1/users/me
 * Perfil do usuário autenticado (qualquer role).
 */
export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const profile = await getMe(user.userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users
 * Lista os usuários do MESMO estabelecimento (ADMIN/MANAGER).
 *
 * ADMIN vê toda a equipe; MANAGER vê apenas WAITER/KITCHEN (ver service),
 * o suficiente para vincular garçons às mesas sem expor credenciais de
 * outros gestores.
 */
export async function listUsersController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const users = await listUsers(user.establishmentId, user.role);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/:id
 * Detalhe de um membro da equipe (ADMIN, sempre dentro do tenant).
 */
export async function getUserController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = userIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const teamUser = await getUserById(parsed.data.id, user.establishmentId);
    res.json({ success: true, data: teamUser });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users
 * Cria um membro da equipe (ADMIN).
 *
 * O establishmentId é injetado passivamente pelo token do ADMIN — nunca
 * aceito no body (multi-tenancy).
 */
export async function createUserController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = createUserSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const created = await createUser(parsed.data, user.establishmentId);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT/PATCH /api/v1/users/:id
 * Atualiza um membro da equipe (ADMIN, tenant via JWT).
 */
export async function updateUserController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);

    const paramsParsed = userIdParamSchema.safeParse(req.params);

    if (!paramsParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        paramsParsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    const bodyParsed = updateUserSchema.safeParse(req.body);

    if (!bodyParsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        bodyParsed.error.issues[0]?.message ?? 'Dados inválidos.',
      );
    }

    const updated = await updateUser(paramsParsed.data.id, bodyParsed.data, user);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/users/:id
 * Remove um membro da equipe (ADMIN, tenant via JWT).
 */
export async function deleteUserController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = userIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Parâmetro inválido.',
      );
    }

    await deleteUser(parsed.data.id, user.establishmentId);
    res.json({ success: true, data: { id: parsed.data.id } });
  } catch (error) {
    next(error);
  }
}
