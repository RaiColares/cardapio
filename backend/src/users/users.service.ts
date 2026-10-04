import { Prisma, UserRole } from '@prisma/client';

import { hashPassword } from '../common/auth/password.js';
import { AppError } from '../common/errors/AppError.js';
import { prisma } from '../common/prisma/prisma.js';
import type { CreateUserInput, UpdateUserInput } from './users.schemas.js';

/**
 * Service do módulo de Usuários.
 *
 * REGRA DE OURO (multi-tenancy): o establishmentId NUNCA vem do corpo da
 * requisição — é derivado do JWT do ADMIN. Um usuário de A jamais enxerga
 * ou altera usuários de B (todo acesso é filtrado por `establishmentId`).
 *
 * O passwordHash nunca é exposto nas respostas.
 */

/** Campos seguros retornados pela API (nunca inclui passwordHash). */
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  active: true,
  establishmentId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/**
 * Perfil do usuário autenticado (GET /users/me).
 */
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
  }

  return user;
}

/**
 * Lista usuários do MESMO estabelecimento (multi-tenancy).
 *
 * O establishmentId vem do token (req.user), nunca do corpo da
 * requisição: um usuário de A jamais enxerga usuários de B.
 *
 * FASE 23: o MANAGER pode listar apenas os papéis operacionais
 * (WAITER/KITCHEN), necessários para vincular garçons às mesas. O ADMIN
 * (e qualquer outro chamador) recebe a equipe completa.
 */
export async function listUsers(establishmentId: string, viewerRole?: UserRole) {
  const scopeWhere =
    viewerRole === UserRole.MANAGER
      ? { role: { in: [UserRole.WAITER, UserRole.KITCHEN] } }
      : {};

  return prisma.user.findMany({
    where: { establishmentId, ...scopeWhere },
    select: userSelect,
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Garante que o usuário existe e pertence ao MESMO estabelecimento.
 * Base de toda operação de detalhe/atualização/exclusão.
 */
async function getTeamUserInTenant(id: string, establishmentId: string) {
  const user = await prisma.user.findFirst({
    where: { id, establishmentId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
  }

  return user;
}

/**
 * Cria um membro da equipe (ADMIN).
 *
 * O establishmentId é injetado passivamente pelo token — jamais aceito
 * no body. A role é restrita a MANAGER/WAITER/KITCHEN pelo schema;
 * a senha recebe hash bcrypt antes da persistência.
 */
export async function createUser(input: CreateUserInput, establishmentId: string) {
  // E-mail é globalmente único na plataforma (evita duplicidade entre tenants).
  const emailInUse = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (emailInUse) {
    throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.user.create({
      data: {
        establishmentId,
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        phone: input.phone ?? null,
        active: true,
      },
      select: userSelect,
    });
  } catch (error) {
    // Proteção contra corrida: e-mail registrado entre a checagem e o create.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
    }

    throw error;
  }
}

/** Detalhe de um membro da equipe (sempre dentro do tenant). */
export async function getUserById(id: string, establishmentId: string) {
  return getTeamUserInTenant(id, establishmentId);
}

/**
 * Atualiza um membro da equipe.
 *
 * Usuários ADMIN (proprietário) não podem ser alterados por este fluxo:
 * isso protege o onboarding e impede que o único ADMIN seja rebaixado,
 * desativado ou tenha o e-mail trocado (evita "lockout" do restaurante).
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: { userId: string; establishmentId: string },
) {
  const target = await getTeamUserInTenant(id, actor.establishmentId);

  if (target.role === UserRole.ADMIN) {
    throw new AppError(400, 'CANNOT_MODIFY_ADMIN', 'O usuário administrador não pode ser modificado.');
  }

  // E-mail alterado: confere unicidade global antes de atualizar.
  if (input.email && input.email !== target.email) {
    const emailInUse = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (emailInUse) {
      throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
    }
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  try {
    return await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        phone: input.phone,
        active: input.active,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: userSelect,
    });
  } catch (error) {
    // Proteção contra corrida na troca de e-mail.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
    }

    throw error;
  }
}

/**
 * Remove um membro da equipe.
 * A exclusão de usuários ADMIN é bloqueada (mesma proteção do update).
 */
export async function deleteUser(id: string, establishmentId: string) {
  const target = await getTeamUserInTenant(id, establishmentId);

  if (target.role === UserRole.ADMIN) {
    throw new AppError(400, 'CANNOT_DELETE_ADMIN', 'O usuário administrador não pode ser excluído.');
  }

  await prisma.user.delete({ where: { id } });
}
